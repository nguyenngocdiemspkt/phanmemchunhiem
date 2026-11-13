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

export async function updateClassAction(classId: string, formData: FormData): Promise<{ ok?: string; error?: string }> {
  const user = await requireUser(["ADMIN"]);
  const before = await prisma.classroom.findUnique({ where: { id: classId }, include: { homeroomTeacher: true, year: { select: { locked: true } } } });
  if (!before) return { error: "Không tìm thấy lớp." };
  if (before.year.locked) return { error: `Năm học ${before.schoolYear} đã khóa.` };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Vui lòng nhập tên lớp." };
  const y = await openYear(formData.get("schoolYear"));
  if ("error" in y) return { error: y.error };
  const schoolYear = y.year.name;
  const dup = await prisma.classroom.findFirst({ where: { name, schoolYear, NOT: { id: classId } } });
  if (dup) return { error: `Năm học ${schoolYear} đã có lớp ${name}.` };
  const rawTeacher = String(formData.get("teacherId") ?? "");
  const teacher = await validTeacher(rawTeacher);
  if (rawTeacher && !teacher) return { error: "Giáo viên không hợp lệ." };
  if (before.schoolYear !== schoolYear) {
    // Đổi năm học của lớp: học sinh của lớp không được đang thuộc lớp khác trong năm học mới
    const conflict = await prisma.enrollment.count({
      where: { schoolYear, student: { enrollments: { some: { classId } } } },
    });
    if (conflict > 0) return { error: `Có học sinh của lớp đã thuộc lớp khác trong năm học ${schoolYear}.` };
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
  revalidatePath("/admin/giao-vien");
  return { ok: teacher ? `Đã lưu. GVCN: ${teacher.fullName}` : "Đã lưu." };
}

/**
 * Xóa hẳn một lớp. Lớp còn học sinh thì xóa luôn các em (tài khoản, hồ sơ, phiếu, điểm, vườn...) cùng mọi dữ liệu
 * của lớp (đợt tự đánh giá, việc tốt, bình chọn, chat...). Phải gõ đúng tên lớp để xác nhận.
 * Hồ sơ đầy đủ của từng học sinh được chụp vào Nhật ký thao tác trước khi xóa.
 */
export async function deleteClassAction(classId: string, confirmName: string): Promise<{ ok?: string; error?: string }> {
  const user = await requireUser(["ADMIN"]);
  const classroom = await prisma.classroom.findUnique({
    where: { id: classId },
    include: { year: { select: { locked: true } }, _count: { select: { students: true, surveys: true } } },
  });
  if (!classroom) return { error: "Không tìm thấy lớp." };
  if (classroom.year.locked) return { error: `Năm học ${classroom.schoolYear} đã khóa. Mở khóa năm học trước khi xóa lớp.` };
  if (confirmName.trim() !== classroom.name) return { error: "Tên lớp gõ lại không khớp, chưa xóa." };

  // Học sinh đang thuộc lớp này (học sinh đã lên lớp khác ở năm sau thì giữ nguyên)
  const full = await prisma.user.findMany({
    where: { role: "STUDENT", student: { classId } },
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
  const names = full.map((u) => `${u.fullName} (${u.username})`);
  await prisma.$transaction([
    prisma.auditLog.createMany({
      data: full.map(({ passwordHash: _omit, ...u }) => ({
        actorId: user.id,
        actorName: user.fullName,
        action: "student.delete",
        entity: "Student",
        entityId: u.student!.id,
        classId,
        summary: `Xóa vĩnh viễn học sinh ${u.fullName} (${u.username}) khi xóa lớp ${classroom.name}, ${u.student!.responses.length} phiếu`,
        detail: JSON.parse(JSON.stringify(u)),
      })),
    }),
    prisma.user.deleteMany({ where: { id: { in: full.map((u) => u.id) }, role: "STUDENT" } }),
    prisma.classroom.delete({ where: { id: classId } }),
  ]);
  await audit(user, "class.delete", {
    entity: "Classroom",
    entityId: classId,
    summary: `Xóa lớp ${classroom.name} (${classroom.schoolYear})${full.length ? `, kèm ${full.length} học sinh` : ""}${classroom._count.surveys ? ` và ${classroom._count.surveys} đợt tự đánh giá` : ""}`,
    detail: { students: names },
  });
  revalidatePath("/", "layout");
  return { ok: `Đã xóa lớp ${classroom.name}${full.length ? ` và ${full.length} học sinh` : ""}.` };
}
