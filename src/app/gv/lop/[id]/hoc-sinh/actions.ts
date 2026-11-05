"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, randomPassword, requireClassAccess } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { classLockedMessage } from "@/lib/schoolYear";
import { applyStudentStatus, enrollStudent, parseStatus, STUDENT_STATUS } from "@/lib/students";
import { parseStudentWorkbook, type StudentRow } from "@/lib/excel";
import { removeDiacritics } from "@/lib/format";

export type CreatedAccount = { fullName: string; username: string; password: string };
/** Học sinh từ năm học trước được xếp vào lớp (dùng lại tài khoản cũ) */
export type EnrolledAccount = { fullName: string; username: string; from: string };
export type ImportState = { created?: CreatedAccount[]; enrolled?: EnrolledAccount[]; errors?: string[]; error?: string } | null;

const MAX_ROWS = 300;
const USERNAME_RE = /^[a-z0-9._-]{3,40}$/;

function slug(s: string) {
  return removeDiacritics(s).replace(/[^a-z0-9]+/g, "");
}

/** "Nguyễn Văn An", lớp "10A1" -> "an.nv.10a1" */
function suggestUsername(fullName: string, className: string) {
  const parts = removeDiacritics(fullName).split(/\s+/).filter(Boolean);
  const given = slug(parts.at(-1) ?? "hs");
  const initials = parts.slice(0, -1).map((p) => slug(p)[0] ?? "").join("");
  return [given, initials, slug(className)].filter(Boolean).join(".");
}

async function createStudents(
  classroom: { id: string; name: string; schoolYear: string; groupCount: number },
  rows: StudentRow[],
) {
  const { id: classId, name: className, groupCount } = classroom;
  const errors: string[] = [];
  // "Tổ 2", "2" -> 2; ngoài khoảng số tổ của lớp thì để trống
  const toGroup = (v?: string) => {
    const n = Number(v?.match(/\d+/)?.[0]);
    return Number.isInteger(n) && n >= 1 && n <= groupCount ? n : null;
  };
  const taken = new Set(
    (
      await prisma.user.findMany({
        where: {
          username: {
            in: rows.flatMap((r) => [r.username?.toLowerCase(), r.studentCode?.toLowerCase()]).filter((x): x is string => !!x),
          },
        },
        select: { username: true },
      })
    ).map((u) => u.username),
  );
  // Mỗi học sinh chỉ thuộc 1 lớp trong 1 năm học: mã đã có lớp trong năm học này thì bỏ qua,
  // mã của học sinh từ năm học khác thì xếp chính em đó vào lớp (dùng lại tài khoản cũ).
  const codes = rows.map((r) => r.studentCode).filter((x): x is string => !!x);
  const known = await prisma.student.findMany({
    where: { studentCode: { in: codes, mode: "insensitive" } },
    select: {
      id: true,
      studentCode: true,
      user: { select: { fullName: true, username: true } },
      classroom: { select: { name: true, schoolYear: true } },
      enrollments: { where: { schoolYear: classroom.schoolYear }, select: { classroom: { select: { name: true } } } },
    },
  });
  const existingCodes = new Map<string, string>();
  const returning = new Map<string, (typeof known)[number]>();
  for (const k of known) {
    const code = k.studentCode!.toLowerCase();
    const sameYear = k.enrollments[0]?.classroom.name ?? (k.classroom.schoolYear === classroom.schoolYear ? k.classroom.name : null);
    if (sameYear) existingCodes.set(code, sameYear);
    else returning.set(code, k);
  }
  const enrolled: EnrolledAccount[] = [];

  async function uniqueUsername(base: string) {
    for (let i = 1; i < 1000; i++) {
      const candidate = i === 1 ? base : `${base}${i}`;
      if (taken.has(candidate)) continue;
      if (await prisma.user.findUnique({ where: { username: candidate }, select: { id: true } })) {
        taken.add(candidate);
        continue;
      }
      taken.add(candidate);
      return candidate;
    }
    throw new Error("Không tạo được tên đăng nhập");
  }

  const prepared: { row: StudentRow; username: string; password: string }[] = [];
  for (const row of rows) {
    const takenBy = row.studentCode && existingCodes.get(row.studentCode.toLowerCase());
    if (takenBy) {
      errors.push(`Dòng ${row.row}: mã học sinh ${row.studentCode} đã có ở lớp ${takenBy} năm học ${classroom.schoolYear}, bỏ qua.`);
      continue;
    }
    const old = row.studentCode && returning.get(row.studentCode.toLowerCase());
    if (old) {
      await prisma.$transaction(async (tx) => {
        await enrollStudent(tx, old.id, classroom);
        const groupNo = toGroup(row.groupNo);
        if (groupNo) await tx.student.update({ where: { id: old.id }, data: { groupNo } });
      });
      existingCodes.set(row.studentCode!.toLowerCase(), className);
      enrolled.push({ fullName: old.user.fullName, username: old.user.username, from: `${old.classroom.name} (${old.classroom.schoolYear})` });
      continue;
    }
    let username: string;
    if (row.username) {
      username = row.username.toLowerCase();
      if (!USERNAME_RE.test(username)) {
        errors.push(`Dòng ${row.row}: tên đăng nhập "${row.username}" không hợp lệ (chỉ gồm chữ không dấu, số, dấu chấm, gạch).`);
        continue;
      }
      if (taken.has(username)) {
        errors.push(`Dòng ${row.row}: tên đăng nhập "${username}" đã tồn tại.`);
        continue;
      }
      taken.add(username);
    } else {
      const fromCode = row.studentCode ? row.studentCode.toLowerCase().replace(/[^a-z0-9._-]/g, "") : "";
      username = await uniqueUsername(USERNAME_RE.test(fromCode) ? fromCode : suggestUsername(row.fullName, className));
    }
    const password = row.password && row.password.length >= 6 ? row.password : randomPassword();
    if (row.studentCode) existingCodes.set(row.studentCode.toLowerCase(), className);
    prepared.push({ row, username, password });
  }

  // bcrypt cost 8 để nhập vài trăm học sinh không vượt thời gian chạy của Vercel;
  // học sinh bắt buộc đổi mật khẩu (cost 10) ở lần đăng nhập đầu.
  const hashes = await Promise.all(prepared.map((p) => hashPassword(p.password, 8)));
  await prisma.$transaction(async (tx) => {
    for (const [i, p] of prepared.entries()) {
      await tx.user.create({
        data: {
          username: p.username,
          fullName: p.row.fullName,
          role: "STUDENT",
          passwordHash: hashes[i],
          mustChangePassword: true,
          student: {
            create: {
              classId,
              studentCode: p.row.studentCode,
              dateOfBirth: p.row.dateOfBirth,
              gender: p.row.gender,
              parentName: p.row.parentName,
              parentPhone: p.row.parentPhone,
              address: p.row.address,
              note: p.row.note,
              groupNo: toGroup(p.row.groupNo),
              enrollments: { create: { classId, schoolYear: classroom.schoolYear } },
            },
          },
        },
      });
    }
  });
  return {
    created: prepared.map((p) => ({ fullName: p.row.fullName, username: p.username, password: p.password })),
    enrolled,
    errors,
  };
}

export async function importStudentsAction(classId: string, _prev: ImportState, formData: FormData): Promise<ImportState> {
  const { user, classroom } = await requireClassAccess(classId);
  const locked = await classLockedMessage(classroom);
  if (locked) return { error: locked };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn file Excel." };
  if (file.size > 5 * 1024 * 1024) return { error: "File quá lớn (tối đa 5MB)." };

  const { rows, error } = await parseStudentWorkbook(await file.arrayBuffer());
  if (error) return { error };
  if (rows.length === 0) return { error: "Không có dòng học sinh nào trong file." };
  if (rows.length > MAX_ROWS) return { error: `Mỗi lần nhập tối đa ${MAX_ROWS} học sinh.` };

  const result = await createStudents(classroom, rows);
  await audit(user, "student.import", {
    entity: "Classroom",
    entityId: classId,
    classId,
    summary: `Nhập ${result.created.length} học sinh mới${result.enrolled.length ? `, xếp lại ${result.enrolled.length} học sinh từ năm trước` : ""} vào lớp ${classroom.name} từ file "${file.name}"${result.errors.length ? `, bỏ qua ${result.errors.length} dòng` : ""}`,
    detail: {
      created: result.created.map((c) => `${c.fullName} (${c.username})`),
      enrolled: result.enrolled.map((c) => `${c.fullName} (${c.username}) từ ${c.from}`),
      errors: result.errors,
    },
  });
  revalidatePath(`/gv/lop/${classId}`, "layout");
  return result;
}

export async function addStudentAction(classId: string, _prev: ImportState, formData: FormData): Promise<ImportState> {
  const { user, classroom } = await requireClassAccess(classId);
  const locked = await classLockedMessage(classroom);
  if (locked) return { error: locked };
  const get = (k: string) => String(formData.get(k) ?? "").trim() || undefined;
  const fullName = get("fullName");
  if (!fullName) return { error: "Vui lòng nhập họ tên." };
  const result = await createStudents(classroom, [
    {
      row: 1,
      fullName,
      studentCode: get("studentCode"),
      dateOfBirth: get("dateOfBirth"),
      gender: get("gender"),
      username: get("username"),
      parentName: get("parentName"),
      parentPhone: get("parentPhone"),
      address: get("address"),
      groupNo: get("groupNo"),
      note: get("note"),
    },
  ]);
  for (const c of result.enrolled) {
    await audit(user, "student.enroll", {
      classId,
      entity: "Classroom",
      entityId: classId,
      summary: `Xếp học sinh ${c.fullName} (${c.username}) từ lớp ${c.from} vào lớp ${classroom.name}`,
    });
  }
  for (const c of result.created) {
    await audit(user, "student.create", {
      classId,
      entity: "Classroom",
      entityId: classId,
      summary: `Thêm học sinh ${c.fullName} (${c.username}) vào lớp ${classroom.name}`,
    });
  }
  revalidatePath(`/gv/lop/${classId}`, "layout");
  return result;
}

export type BatchState = { error?: string; ok?: string } | null;

/**
 * Cập nhật hàng loạt học sinh được chọn: phân tổ, đổi trạng thái, khóa/mở tài khoản.
 * op: "group:<số>" | "group:none" | "status:<ACTIVE|TRANSFERRED|LEFT>"
 */
export async function batchStudentsAction(classId: string, _prev: BatchState, formData: FormData): Promise<BatchState> {
  const { user, classroom } = await requireClassAccess(classId);
  const locked = await classLockedMessage(classroom);
  if (locked) return { error: locked };
  const ids = [...new Set(formData.getAll("ids").map(String))];
  if (ids.length === 0) return { error: "Hãy chọn ít nhất một học sinh." };
  const students = await prisma.student.findMany({
    where: { id: { in: ids }, classId },
    select: { id: true, user: { select: { fullName: true } } },
  });
  if (students.length === 0) return { error: "Không tìm thấy học sinh đã chọn trong lớp." };
  const names = students.map((s) => s.user.fullName);
  const op = String(formData.get("op") ?? "");

  let summary: string;
  if (op.startsWith("group:")) {
    const raw = op.slice(6);
    const groupNo = raw === "none" ? null : Number(raw);
    if (groupNo !== null && !(Number.isInteger(groupNo) && groupNo >= 1 && groupNo <= classroom.groupCount)) {
      return { error: "Tổ không hợp lệ." };
    }
    await prisma.student.updateMany({ where: { id: { in: students.map((s) => s.id) } }, data: { groupNo } });
    summary = groupNo ? `Chuyển ${students.length} học sinh vào tổ ${groupNo}` : `Bỏ phân tổ ${students.length} học sinh`;
  } else if (op.startsWith("status:")) {
    const status = parseStatus(op.slice(7));
    if (!status) return { error: "Trạng thái không hợp lệ." };
    await prisma.$transaction(async (tx) => {
      for (const s of students) await applyStudentStatus(tx, s.id, status);
    });
    summary = `Đổi trạng thái ${students.length} học sinh thành "${STUDENT_STATUS[status].label}"`;
  } else {
    return { error: "Hãy chọn thao tác." };
  }

  await audit(user, "student.batch", {
    entity: "Classroom",
    entityId: classId,
    classId,
    summary: `Lớp ${classroom.name}: ${summary}`,
    detail: { students: names, op },
  });
  revalidatePath(`/gv/lop/${classId}`, "layout");
  return { ok: `${summary}.` };
}
