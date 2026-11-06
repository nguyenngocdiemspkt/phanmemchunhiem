"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { enrollManyOps } from "@/lib/students";

export type PromoteState = { error?: string; ok?: string; skipped?: string[] } | null;

/**
 * Xếp các học sinh được chọn của lớp nguồn vào lớp đích (thường là lớp của năm học mới).
 * Học sinh đã có lớp trong năm học của lớp đích thì bỏ qua: mỗi năm học chỉ thuộc 1 lớp.
 */
export async function promoteStudentsAction(_prev: PromoteState, formData: FormData): Promise<PromoteState> {
  const user = await requireUser(["ADMIN"]);
  const source = await prisma.classroom.findUnique({ where: { id: String(formData.get("fromClassId") ?? "") } });
  const target = await prisma.classroom.findUnique({ where: { id: String(formData.get("toClassId") ?? "") }, include: { year: true } });
  if (!source || !target) return { error: "Vui lòng chọn lớp nguồn và lớp đích." };
  if (source.id === target.id) return { error: "Lớp đích phải khác lớp nguồn." };
  if (target.year.locked) return { error: `Năm học ${target.schoolYear} đã khóa.` };
  const ids = [...new Set(formData.getAll("ids").map(String))];
  if (ids.length === 0) return { error: "Hãy chọn ít nhất một học sinh." };

  const students = await prisma.student.findMany({
    where: { id: { in: ids }, enrollments: { some: { classId: source.id } } },
    include: {
      user: { select: { fullName: true } },
      enrollments: { where: { schoolYear: target.schoolYear }, include: { classroom: { select: { name: true } } } },
    },
  });
  const moved: string[] = [];
  const skipped: string[] = [];
  const toMove: string[] = [];
  for (const s of students) {
    const current = s.enrollments[0];
    if (current) {
      if (current.classId !== target.id) skipped.push(`${s.user.fullName}: đã thuộc lớp ${current.classroom.name} năm học ${target.schoolYear}`);
      continue;
    }
    toMove.push(s.id);
    moved.push(s.user.fullName);
  }
  if (toMove.length) {
    await prisma.$transaction(enrollManyOps(target, toMove, { fromClassId: source.id, reason: "Xếp lớp năm học mới", actorId: user.id }));
  }
  if (moved.length) {
    const summary = `Xếp ${moved.length} học sinh lớp ${source.name} (${source.schoolYear}) vào lớp ${target.name} (${target.schoolYear})`;
    for (const classId of [target.id, source.id]) {
      await audit(user, "student.promote", { entity: "Classroom", entityId: classId, classId, summary, detail: { students: moved } });
    }
  }
  revalidatePath("/", "layout");
  return {
    ok: moved.length ? `Đã xếp ${moved.length} học sinh vào lớp ${target.name} (${target.schoolYear}).` : "Không có học sinh nào được xếp thêm.",
    skipped,
  };
}
