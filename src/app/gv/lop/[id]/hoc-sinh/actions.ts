"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, randomPassword, requireClassAccess } from "@/lib/auth";
import { parseStudentWorkbook, type StudentRow } from "@/lib/excel";
import { removeDiacritics } from "@/lib/format";

export type CreatedAccount = { fullName: string; username: string; password: string };
export type ImportState = { created?: CreatedAccount[]; errors?: string[]; error?: string } | null;

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

async function createStudents(classId: string, className: string, rows: StudentRow[]) {
  const errors: string[] = [];
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
  const existingCodes = new Set(
    (await prisma.student.findMany({ where: { classId, studentCode: { not: null } }, select: { studentCode: true } })).map(
      (s) => s.studentCode,
    ),
  );

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
    if (row.studentCode && existingCodes.has(row.studentCode)) {
      errors.push(`Dòng ${row.row}: mã học sinh ${row.studentCode} đã có trong lớp, bỏ qua.`);
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
    if (row.studentCode) existingCodes.add(row.studentCode);
    prepared.push({ row, username, password });
  }

  // bcrypt cost 8 để nhập vài trăm học sinh không vượt thời gian chạy của Vercel;
  // học sinh bắt buộc đổi mật khẩu (cost 10) ở lần đăng nhập đầu.
  const hashes = await Promise.all(prepared.map((p) => hashPassword(p.password, 8)));
  await prisma.$transaction(
    prepared.map((p, i) =>
      prisma.user.create({
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
            },
          },
        },
      }),
    ),
  );
  return {
    created: prepared.map((p) => ({ fullName: p.row.fullName, username: p.username, password: p.password })),
    errors,
  };
}

export async function importStudentsAction(classId: string, _prev: ImportState, formData: FormData): Promise<ImportState> {
  const { classroom } = await requireClassAccess(classId);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Vui lòng chọn file Excel." };
  if (file.size > 5 * 1024 * 1024) return { error: "File quá lớn (tối đa 5MB)." };

  const { rows, error } = await parseStudentWorkbook(await file.arrayBuffer());
  if (error) return { error };
  if (rows.length === 0) return { error: "Không có dòng học sinh nào trong file." };
  if (rows.length > MAX_ROWS) return { error: `Mỗi lần nhập tối đa ${MAX_ROWS} học sinh.` };

  const result = await createStudents(classId, classroom.name, rows);
  revalidatePath(`/gv/lop/${classId}`, "layout");
  return result;
}

export async function addStudentAction(classId: string, _prev: ImportState, formData: FormData): Promise<ImportState> {
  const { classroom } = await requireClassAccess(classId);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || undefined;
  const fullName = get("fullName");
  if (!fullName) return { error: "Vui lòng nhập họ tên." };
  const result = await createStudents(classId, classroom.name, [
    {
      row: 1,
      fullName,
      studentCode: get("studentCode"),
      dateOfBirth: get("dateOfBirth"),
      gender: get("gender"),
      username: get("username"),
      parentName: get("parentName"),
      parentPhone: get("parentPhone"),
    },
  ]);
  revalidatePath(`/gv/lop/${classId}`, "layout");
  return result;
}
