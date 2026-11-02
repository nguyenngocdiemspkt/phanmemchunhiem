"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export type ClassFormState = { error?: string; ok?: string } | null;

async function validTeacherId(raw: FormDataEntryValue | null) {
  const id = String(raw ?? "");
  if (!id) return null;
  const t = await prisma.user.findFirst({ where: { id, role: { in: ["TEACHER", "ADMIN"] } } });
  return t ? t.id : null;
}

export async function createClassAction(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  await requireUser(["ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const schoolYear = String(formData.get("schoolYear") ?? "").trim();
  if (!name || !schoolYear) return { error: "Vui lòng nhập tên lớp và năm học." };
  if (await prisma.classroom.findUnique({ where: { name_schoolYear: { name, schoolYear } } })) {
    return { error: `Lớp ${name} năm học ${schoolYear} đã tồn tại.` };
  }
  await prisma.classroom.create({
    data: { name, schoolYear, homeroomTeacherId: await validTeacherId(formData.get("teacherId")) },
  });
  revalidatePath("/admin/lop");
  return { ok: `Đã tạo lớp ${name}.` };
}

export async function updateClassAction(classId: string, formData: FormData) {
  await requireUser(["ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  const schoolYear = String(formData.get("schoolYear") ?? "").trim();
  if (!name || !schoolYear) return;
  const dup = await prisma.classroom.findFirst({ where: { name, schoolYear, NOT: { id: classId } } });
  if (dup) return;
  await prisma.classroom.update({
    where: { id: classId },
    data: { name, schoolYear, homeroomTeacherId: await validTeacherId(formData.get("teacherId")) },
  });
  revalidatePath("/admin/lop");
}

export async function deleteClassAction(classId: string) {
  await requireUser(["ADMIN"]);
  // Chỉ cho xóa lớp trống để tránh mất dữ liệu học sinh
  const count = await prisma.student.count({ where: { classId } });
  if (count > 0) return;
  await prisma.classroom.delete({ where: { id: classId } });
  revalidatePath("/admin/lop");
}
