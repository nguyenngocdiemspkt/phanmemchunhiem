"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword, randomPassword, requireClassAccess } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { classLockedMessage } from "@/lib/schoolYear";
import { parseStatus, STUDENT_STATUS } from "@/lib/students";
import { parseStudentWorkbook, type StudentRow } from "@/lib/excel";
import { removeDiacritics } from "@/lib/format";

export type CreatedAccount = { fullName: string; username: string; password: string };
/** Học sinh từ năm học trước được xếp vào lớp (dùng lại tài khoản cũ) */
export type EnrolledAccount = { fullName: string; username: string; from: string };
/** Học sinh đã có trong lớp, được cập nhật thông tin theo file (giữ nguyên tài khoản, mật khẩu) */
export type UpdatedAccount = { fullName: string; username: string; changes: string[] };
export type ImportState = {
  created?: CreatedAccount[];
  enrolled?: EnrolledAccount[];
  updated?: UpdatedAccount[];
  errors?: string[];
  error?: string;
} | null;

// Cột trong file -> trường hồ sơ, dùng khi cập nhật học sinh đã có trong lớp
const UPDATE_FIELDS = [
  ["dateOfBirth", "ngày sinh"],
  ["gender", "giới tính"],
  ["parentName", "phụ huynh"],
  ["parentPhone", "SĐT phụ huynh"],
  ["address", "địa chỉ"],
  ["note", "ghi chú"],
] as const;

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

/**
 * Tạo/cập nhật/xếp lớp học sinh từ các dòng của file. Số lệnh gửi tới cơ sở dữ liệu cố định
 * (2 lệnh đọc + 1 giao dịch lô vài lệnh) dù lớp đông bao nhiêu: trên Vercel, mỗi lượt đi về
 * Neon có thể mất hàng trăm ms nên không được gọi cơ sở dữ liệu theo từng em.
 */
async function createStudents(
  classroom: { id: string; name: string; schoolYear: string; groupCount: number },
  rows: StudentRow[],
  actorId: string,
) {
  const { id: classId, name: className, groupCount } = classroom;
  const errors: string[] = [];
  // "Tổ 2", "2" -> 2; ngoài khoảng số tổ của lớp thì để trống
  const toGroup = (v?: string) => {
    const n = Number(v?.match(/\d+/)?.[0]);
    return Number.isInteger(n) && n >= 1 && n <= groupCount ? n : null;
  };
  const baseUsername = (row: StudentRow) => {
    const fromCode = row.studentCode ? row.studentCode.toLowerCase().replace(/[^a-z0-9._-]/g, "") : "";
    return USERNAME_RE.test(fromCode) ? fromCode : suggestUsername(row.fullName, className);
  };

  // Mỗi học sinh chỉ thuộc 1 lớp trong 1 năm học:
  // - mã đã có trong chính lớp này: cập nhật thông tin theo file (giữ tài khoản, mật khẩu, phiếu)
  // - mã đang ở lớp khác cùng năm học: bỏ qua
  // - mã của học sinh từ năm học khác: xếp chính em đó vào lớp (dùng lại tài khoản cũ)
  const codes = rows.map((r) => r.studentCode).filter((x): x is string => !!x);
  const explicit = rows.map((r) => r.username?.toLowerCase()).filter((x): x is string => !!x);
  const bases = [...new Set(rows.map(baseUsername))];
  const [known, existingUsers] = await Promise.all([
    prisma.student.findMany({
      where: { studentCode: { in: codes, mode: "insensitive" } },
      select: {
        id: true,
        classId: true,
        studentCode: true,
        dateOfBirth: true,
        gender: true,
        parentName: true,
        parentPhone: true,
        address: true,
        note: true,
        groupNo: true,
        userId: true,
        user: { select: { fullName: true, username: true } },
        classroom: { select: { name: true, schoolYear: true } },
        enrollments: { where: { schoolYear: classroom.schoolYear }, select: { classroom: { select: { id: true, name: true } } } },
      },
    }),
    // Mọi tên đăng nhập có thể trùng (tên tự đặt, tên gốc và các biến thể có số phía sau) trong một truy vấn
    prisma.user.findMany({
      where: { OR: [{ username: { in: explicit } }, ...bases.map((b) => ({ username: { startsWith: b } }))] },
      select: { username: true },
    }),
  ]);
  const taken = new Set(existingUsers.map((u) => u.username));
  const existingCodes = new Map<string, string>();
  const inThisClass = new Map<string, (typeof known)[number]>();
  const returning = new Map<string, (typeof known)[number]>();
  for (const k of known) {
    const code = k.studentCode!.toLowerCase();
    const sameYear =
      k.enrollments[0]?.classroom ?? (k.classroom.schoolYear === classroom.schoolYear ? { id: k.classId, name: k.classroom.name } : null);
    if (sameYear?.id === classId) inThisClass.set(code, k);
    else if (sameYear) existingCodes.set(code, sameYear.name);
    else returning.set(code, k);
  }

  function uniqueUsername(base: string) {
    for (let i = 1; i < 1000; i++) {
      const candidate = i === 1 ? base : `${base}${i}`;
      if (!taken.has(candidate)) {
        taken.add(candidate);
        return candidate;
      }
    }
    throw new Error("Không tạo được tên đăng nhập");
  }

  const enrolled: EnrolledAccount[] = [];
  const updated: UpdatedAccount[] = [];
  const seenInFile = new Set<string>();
  // Cập nhật hồ sơ: null = giữ nguyên giá trị cũ
  type ProfilePatch = { studentId: string; userId: string; fullName: string | null; groupNo: number | null } & Record<
    (typeof UPDATE_FIELDS)[number][0],
    string | null
  >;
  const emptyPatch = (studentId: string, userId: string): ProfilePatch => ({
    studentId,
    userId,
    fullName: null,
    groupNo: null,
    dateOfBirth: null,
    gender: null,
    parentName: null,
    parentPhone: null,
    address: null,
    note: null,
  });
  const patches: ProfilePatch[] = [];
  const returningRows: { student: (typeof known)[number]; groupNo: number | null }[] = [];
  const prepared: { row: StudentRow; username: string; password: string }[] = [];

  for (const row of rows) {
    if (row.studentCode) {
      const code = row.studentCode.toLowerCase();
      if (seenInFile.has(code)) {
        errors.push(`Dòng ${row.row}: mã học sinh ${row.studentCode} bị lặp lại trong file, bỏ qua.`);
        continue;
      }
      seenInFile.add(code);
    }
    const current = row.studentCode && inThisClass.get(row.studentCode.toLowerCase());
    if (current) {
      // Chỉ ghi đè các ô có dữ liệu trong file; không đổi tên đăng nhập, mật khẩu
      const patch = emptyPatch(current.id, current.userId);
      const changes: string[] = [];
      if (row.fullName !== current.user.fullName) {
        patch.fullName = row.fullName;
        changes.push(`họ tên: ${current.user.fullName} → ${row.fullName}`);
      }
      for (const [field, label] of UPDATE_FIELDS) {
        const value = row[field];
        if (value && value !== current[field]) {
          patch[field] = value;
          changes.push(`${label}: ${current[field] ?? "(trống)"} → ${value}`);
        }
      }
      const groupNo = toGroup(row.groupNo);
      if (groupNo && groupNo !== current.groupNo) {
        patch.groupNo = groupNo;
        changes.push(`tổ: ${current.groupNo ?? "(chưa có)"} → ${groupNo}`);
      }
      if (changes.length) {
        patches.push(patch);
        updated.push({ fullName: row.fullName, username: current.user.username, changes });
      }
      continue;
    }
    const takenBy = row.studentCode && existingCodes.get(row.studentCode.toLowerCase());
    if (takenBy) {
      errors.push(`Dòng ${row.row}: mã học sinh ${row.studentCode} đã có ở lớp ${takenBy} năm học ${classroom.schoolYear}, bỏ qua.`);
      continue;
    }
    const old = row.studentCode && returning.get(row.studentCode.toLowerCase());
    if (old) {
      returningRows.push({ student: old, groupNo: toGroup(row.groupNo) });
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
      username = uniqueUsername(baseUsername(row));
    }
    const password = row.password && row.password.length >= 6 ? row.password : randomPassword();
    prepared.push({ row, username, password });
  }

  // bcrypt cost 8 để nhập vài trăm học sinh không vượt thời gian chạy của Vercel;
  // học sinh bắt buộc đổi mật khẩu (cost 10) ở lần đăng nhập đầu.
  const hashes = await Promise.all(prepared.map((p) => hashPassword(p.password, 8)));
  const fresh = prepared.map((p, i) => ({ ...p, hash: hashes[i], userId: randomUUID(), studentId: randomUUID() }));
  const returningIds = returningRows.map((r) => r.student.id);
  // Tổ của học sinh năm trước được đặt sau khi xếp lớp (xếp lớp bỏ tổ cũ)
  for (const r of returningRows) {
    if (r.groupNo) patches.push({ ...emptyPatch(r.student.id, r.student.userId), groupNo: r.groupNo });
  }
  const nameUpdates = patches.filter((p) => p.fullName);

  // Một giao dịch dạng lô, số lệnh cố định
  await prisma.$transaction([
    ...(fresh.length
      ? [
          prisma.user.createMany({
            data: fresh.map((p) => ({
              id: p.userId,
              username: p.username,
              fullName: p.row.fullName,
              role: "STUDENT" as const,
              passwordHash: p.hash,
              mustChangePassword: true,
            })),
          }),
          prisma.student.createMany({
            data: fresh.map((p) => ({
              id: p.studentId,
              userId: p.userId,
              classId,
              studentCode: p.row.studentCode,
              dateOfBirth: p.row.dateOfBirth,
              gender: p.row.gender,
              parentName: p.row.parentName,
              parentPhone: p.row.parentPhone,
              address: p.row.address,
              note: p.row.note,
              groupNo: toGroup(p.row.groupNo),
            })),
          }),
          prisma.enrollment.createMany({
            data: fresh.map((p) => ({ studentId: p.studentId, classId, schoolYear: classroom.schoolYear })),
          }),
        ]
      : []),
    ...(returningIds.length
      ? [
          prisma.enrollment.createMany({
            data: returningIds.map((studentId) => ({ studentId, classId, schoolYear: classroom.schoolYear })),
            skipDuplicates: true,
          }),
          prisma.student.updateMany({
            where: { id: { in: returningIds }, classroom: { schoolYear: { lte: classroom.schoolYear } } },
            data: { classId, groupNo: null, isMonitor: false, isGroupLeader: false },
          }),
          prisma.classTransfer.createMany({
            data: returningRows.map((r) => ({
              studentId: r.student.id,
              fromClassId: r.student.classId,
              toClassId: classId,
              reason: "Nhập danh sách lớp năm học mới",
              actorId,
            })),
          }),
        ]
      : []),
    ...(nameUpdates.length
      ? [
          prisma.$executeRaw`
            UPDATE "User" AS u SET "fullName" = v.full_name
            FROM (VALUES ${Prisma.join(nameUpdates.map((p) => Prisma.sql`(${p.userId}::text, ${p.fullName}::text)`))}) AS v(id, full_name)
            WHERE u."id" = v.id`,
        ]
      : []),
    ...(patches.length
      ? [
          prisma.$executeRaw`
            UPDATE "Student" AS s SET
              "dateOfBirth" = COALESCE(v.dob, s."dateOfBirth"),
              "gender" = COALESCE(v.gender, s."gender"),
              "parentName" = COALESCE(v.parent_name, s."parentName"),
              "parentPhone" = COALESCE(v.parent_phone, s."parentPhone"),
              "address" = COALESCE(v.address, s."address"),
              "note" = COALESCE(v.note, s."note"),
              "isGroupLeader" = CASE WHEN v.grp IS NOT NULL AND v.grp IS DISTINCT FROM s."groupNo" THEN false ELSE s."isGroupLeader" END,
              "groupNo" = COALESCE(v.grp, s."groupNo")
            FROM (VALUES ${Prisma.join(
              patches.map(
                (p) =>
                  Prisma.sql`(${p.studentId}::text, ${p.dateOfBirth}::text, ${p.gender}::text, ${p.parentName}::text, ${p.parentPhone}::text, ${p.address}::text, ${p.note}::text, ${p.groupNo}::int)`,
              ),
            )}) AS v(id, dob, gender, parent_name, parent_phone, address, note, grp)
            WHERE s."id" = v.id`,
        ]
      : []),
  ]);
  return {
    created: prepared.map((p) => ({ fullName: p.row.fullName, username: p.username, password: p.password })),
    enrolled,
    updated,
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

  const result = await createStudents(classroom, rows, user.id);
  await audit(user, "student.import", {
    entity: "Classroom",
    entityId: classId,
    classId,
    summary: `Nhập ${result.created.length} học sinh mới${result.enrolled.length ? `, xếp lại ${result.enrolled.length} học sinh từ năm trước` : ""}${result.updated.length ? `, cập nhật thông tin ${result.updated.length} học sinh đã có` : ""} vào lớp ${classroom.name} từ file "${file.name}"${result.errors.length ? `, bỏ qua ${result.errors.length} dòng` : ""}`,
    detail: {
      created: result.created.map((c) => `${c.fullName} (${c.username})`),
      enrolled: result.enrolled.map((c) => `${c.fullName} (${c.username}) từ ${c.from}`),
      updated: result.updated.map((c) => `${c.fullName} (${c.username}): ${c.changes.join("; ")}`),
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
  ], user.id);
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
    const ids = students.map((s) => s.id);
    // Cả nhóm trong 2 lệnh; học sinh không còn "Đang học" thì khóa đăng nhập
    await prisma.$transaction([
      prisma.student.updateMany({ where: { id: { in: ids } }, data: { status, statusChangedAt: new Date() } }),
      prisma.user.updateMany({ where: { student: { id: { in: ids } } }, data: { active: status === "ACTIVE" } }),
    ]);
    summary = `Đổi trạng thái ${students.length} học sinh thành "${STUDENT_STATUS[status].label}"`;
  } else if (op === "delete") {
    // Xóa hẳn nhiều học sinh: chụp toàn bộ hồ sơ, phiếu, nhận xét vào nhật ký rồi xóa trong một lệnh
    const full = await prisma.user.findMany({
      where: { student: { id: { in: students.map((s) => s.id) } } },
      include: {
        student: {
          include: {
            responses: { include: { feedback: true, survey: { select: { title: true } } } },
            notes: true,
            transfers: true,
            enrollments: true,
          },
        },
      },
    });
    await prisma.auditLog.createMany({
      data: full.map(({ passwordHash: _omit, ...u }) => ({
        actorId: user.id,
        actorName: user.fullName,
        action: "student.delete",
        entity: "Student",
        entityId: u.student!.id,
        classId,
        summary: `Xóa vĩnh viễn học sinh ${u.fullName} (${u.username}), lớp ${classroom.name}, ${u.student!.responses.length} phiếu`,
        detail: JSON.parse(JSON.stringify(u)),
      })),
    });
    await prisma.user.deleteMany({ where: { id: { in: full.map((u) => u.id) }, role: "STUDENT" } });
    revalidatePath("/", "layout");
    return { ok: `Đã xóa hẳn ${full.length} học sinh. Bản chụp dữ liệu được lưu trong Nhật ký thao tác.` };
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
