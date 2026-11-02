"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, requireUser, verifyPassword } from "@/lib/auth";

export type ChangePasswordState = { error?: string } | null;

export async function changePasswordAction(_prev: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await requireUser(undefined, { allowMustChange: true });
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Mật khẩu hiện tại không đúng." };
  if (next.length < 6) return { error: "Mật khẩu mới phải có ít nhất 6 ký tự." };
  if (next !== confirm) return { error: "Nhập lại mật khẩu mới không khớp." };
  if (next === current) return { error: "Mật khẩu mới phải khác mật khẩu hiện tại." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false },
  });
  redirect("/");
}
