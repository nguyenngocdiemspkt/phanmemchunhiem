"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getGardenPreset } from "@/lib/gardenPreset";

export type ClassFormState = { error?: string; ok?: string } | null;

async function validTeacher(raw: FormDataEntryValue | null) {
  const id = String(raw ?? "");
  if (!id) return null;
  return prisma.user.findFirst({ where: { id, role: { in: ["TEACHER", "ADMIN"] } }, select: { id: true, fullName: true } });
}

async function openYear(raw: FormDataEntryValue | null) {
  const year = await prisma.schoolYear.findUnique({ where: { name: String(raw ?? "") } });
  if (!year) return { error: "Vui lòng chọn năm học (tạo ở mục Năm học nếu chưa có)." } as const;
  if (year.locked) return { error: `Năm học ${year.name} đã khóa.` } as const;
  return { year } as const;
}

export async function createClassAction(_prev: ClassFormState, formData: FormData): Promise<ClassFormState> {
  const user = await requireUser(["ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Vui lòng nhập tên lớp." };
  const y = await openYear(formData.get("schoolYear"));
  if ("error" in y) return { error: y.error };
  const schoolYear = y.year.name;
  if (await prisma.classroom.findUnique({ where: { name_schoolYear: { name, schoolYear } } })) {
    return { error: `Lớp ${name} năm học ${schoolYear} đã tồn tại.` };
  }
  const teacher = await validTeacher(formData.get("teacherId"));
  // Vườn lớp dùng bộ chuẩn của hệ thống; GVCN chỉnh riêng sau nếu muốn
  const classroom = await prisma.classroom.create({ data: { name, schoolYear, homeroomTeacherId: teacher?.id ?? null, ...(await getGardenPreset()) } });
  await audit(user, "class.create", {
    entity: "Classroom",
    entityId: classroom.id,
    classId: classroom.id,
    summary: `Tạo lớp ${name} (${schoolYear})${teacher ? `, GVCN ${teacher.fullName}` : ""}`,
  });
  revalidatePath("/admin/lop");
  return { ok: `Đã tạo lớp ${name}.` };
}

export async function updateClassAction(classId: string, formData: FormData) {
  const user = await requireUser(["ADMIN"]);
  const before = await prisma.classroom.findUnique({ where: { id: classId }, include: { homeroomTeacher: true } });
  if (!before) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const y = await openYear(formData.get("schoolYear"));
  if ("error" in y) return;
  const schoolYear = y.year.name;
  const dup = await prisma.classroom.findFirst({ where: { name, schoolYear, NOT: { id: classId } } });
  if (dup) return;
  const teacher = await validTeacher(formData.get("teacherId"));
  if (before.schoolYear !== schoolYear) {
    // Đổi năm học của lớp: học sinh của lớp không được đang thuộc lớp khác trong năm học mới
    const conflict = await prisma.enrollment.count({
      where: { schoolYear, student: { enrollments: { some: { classId } } } },
    });
    if (conflict > 0) return;
  }
  await prisma.$transaction([
    prisma.classroom.update({ where: { id: classId }, data: { name, schoolYear, homeroomTeacherId: teacher?.id ?? null } }),
    prisma.enrollment.updateMany({ where: { classId }, data: { schoolYear } }),
  ]);

  const changes: string[] = [];
  if (before.name !== name) changes.push(`tên ${before.name} → ${name}`);
  if (before.schoolYear !== schoolYear) changes.push(`năm học ${before.schoolYear} → ${schoolYear}`);
  if (before.homeroomTeacherId !== (teacher?.id ?? null)) {
    changes.push(`GVCN ${before.homeroomTeacher?.fullName ?? "(trống)"} → ${teacher?.fullName ?? "(trống)"}`);
  }
  if (changes.length) {
    await audit(user, before.homeroomTeacherId !== (teacher?.id ?? null) ? "class.assign" : "class.update", {
      entity: "Classroom",
      entityId: classId,
      classId,
      summary: `Lớp ${name}: ${changes.join("; ")}`,
    });
  }
  revalidatePath("/admin/lop");
}

export async function deleteClassAction(classId: string) {
  const user = await requireUser(["ADMIN"]);
  // Chỉ cho xóa lớp trống để tránh mất dữ liệu học sinh
  const classroom = await prisma.classroom.findUnique({
    where: { id: classId },
    include: { _count: { select: { students: true, surveys: true, enrollments: true } } },
  });
  if (!classroom || classroom._count.students > 0 || classroom._count.surveys > 0 || classroom._count.enrollments > 0) return;
  await prisma.classroom.delete({ where: { id: classId } });
  await audit(user, "class.delete", {
    entity: "Classroom",
    entityId: classId,
    summary: `Xóa lớp ${classroom.name} (${classroom.schoolYear})`,
  });
  revalidatePath("/admin/lop");
}
