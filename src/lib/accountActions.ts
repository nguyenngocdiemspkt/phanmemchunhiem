"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { hashPassword, randomPassword, requireUser } from "./auth";

/** Quản trị quản lý mọi tài khoản (trừ chính mình); giáo viên chỉ quản lý học sinh lớp mình chủ nhiệm. */
async function canManage(targetId: string) {
  const actor = await requireUser(["ADMIN", "TEACHER"]);
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    include: { student: { include: { classroom: true } } },
  });
  if (!target || target.id === actor.id) return null;
  if (actor.role === "ADMIN") return target;
  if (target.role === "STUDENT" && target.student?.classroom.homeroomTeacherId === actor.id) return target;
  return null;
}

export type ResetState = { password?: string; error?: string } | null;

export async function resetPasswordAction(userId: string, _prev: ResetState): Promise<ResetState> {
  const target = await canManage(userId);
  if (!target) return { error: "Không có quyền." };
  const password = randomPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  return { password };
}

export async function toggleActiveAction(userId: string) {
  const target = await canManage(userId);
  if (!target) return;
  await prisma.user.update({ where: { id: userId }, data: { active: !target.active } });
  revalidatePath("/", "layout");
}
