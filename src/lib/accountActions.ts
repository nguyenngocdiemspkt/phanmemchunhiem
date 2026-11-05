"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { hashPassword, randomPassword, requireUser } from "./auth";
import { audit } from "./audit";
import { classLockedMessage } from "./schoolYear";

/** Quản trị quản lý mọi tài khoản (trừ chính mình); giáo viên chỉ quản lý học sinh lớp mình chủ nhiệm. */
async function canManage(targetId: string) {
  const actor = await requireUser(["ADMIN", "TEACHER"]);
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    include: { student: { include: { classroom: true } } },
  });
  if (!target || target.id === actor.id) return null;
  if (actor.role === "ADMIN") return { actor, target };
  if (target.role === "STUDENT" && target.student?.classroom.homeroomTeacherId === actor.id) return { actor, target };
  return null;
}

export type ResetState = { password?: string; error?: string } | null;

export async function resetPasswordAction(userId: string, _prev: ResetState): Promise<ResetState> {
  const allowed = await canManage(userId);
  if (!allowed) return { error: "Không có quyền." };
  const { actor, target } = allowed;
  const password = randomPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  await audit(actor, "auth.reset", {
    entity: "User",
    entityId: userId,
    classId: target.student?.classId,
    summary: `Cấp lại mật khẩu cho ${target.fullName} (${target.username})`,
  });
  return { password };
}

export async function toggleActiveAction(userId: string) {
  const allowed = await canManage(userId);
  if (!allowed) return;
  const { actor, target } = allowed;
  // Học sinh đã nghỉ/chuyển trường: mở lại bằng cách đổi trạng thái về "Đang học"
  if (!target.active && target.student && target.student.status !== "ACTIVE") return;
  await prisma.user.update({ where: { id: userId }, data: { active: !target.active } });
  await audit(actor, target.role === "STUDENT" ? "student.lock" : "teacher.lock", {
    entity: "User",
    entityId: userId,
    classId: target.student?.classId,
    summary: `${target.active ? "Khóa" : "Mở khóa"} tài khoản ${target.fullName} (${target.username})`,
  });
  revalidatePath("/", "layout");
}

/**
 * Xóa hẳn tài khoản học sinh, kèm hồ sơ, phiếu đã nộp, nhận xét và ghi chú (cascade).
 * Quản trị hoặc GVCN của lớp được làm; toàn bộ dữ liệu được chụp lại vào nhật ký trước khi xóa.
 */
export async function deleteStudentAction(userId: string) {
  const allowed = await canManage(userId);
  if (!allowed) return;
  const { actor } = allowed;
  if (allowed.target.student && (await classLockedMessage(allowed.target.student.classroom))) return;
  const target = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: {
        include: {
          classroom: { select: { name: true, schoolYear: true } },
          responses: { include: { feedback: true, survey: { select: { title: true, classId: true } } } },
          notes: true,
          transfers: true,
        },
      },
    },
  });
  if (!target || target.role !== "STUDENT" || !target.student) return;
  const { passwordHash: _omit, ...userSnapshot } = target;
  await audit(actor, "student.delete", {
    entity: "Student",
    entityId: target.student.id,
    classId: target.student.classId,
    summary: `Xóa vĩnh viễn học sinh ${target.fullName} (${target.username}), lớp ${target.student.classroom.name}, ${target.student.responses.length} phiếu`,
    detail: JSON.parse(JSON.stringify(userSnapshot)),
  });
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/", "layout");
}
