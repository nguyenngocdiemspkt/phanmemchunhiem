"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export type LoginState = { error?: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Vui lòng nhập tên đăng nhập và mật khẩu." };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }
  if (!user.active) return { error: "Tài khoản đã bị khóa. Vui lòng liên hệ giáo viên hoặc nhà trường." };

  await createSession(user);
  redirect("/");
}
