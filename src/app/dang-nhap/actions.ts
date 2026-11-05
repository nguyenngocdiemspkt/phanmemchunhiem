"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export type LoginState = { error?: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Vui lòng nhập tên đăng nhập và mật khẩu." };

  const user = await prisma.user.findUnique({ where: { username }, include: { student: { select: { classId: true } } } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    if (user) {
      await audit(null, "auth.fail", {
        entity: "User",
        entityId: user.id,
        classId: user.student?.classId,
        summary: `Đăng nhập sai mật khẩu: ${user.username}`,
      });
    }
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }
  if (!user.active) return { error: "Tài khoản đã bị khóa. Vui lòng liên hệ giáo viên hoặc nhà trường." };

  // Chỉ ghi đăng nhập của quản trị/giáo viên để nhật ký không bị ngập bởi học sinh
  if (user.role !== "STUDENT") {
    await audit(user, "auth.login", { entity: "User", entityId: user.id, summary: `${user.fullName} đăng nhập` });
  }
  await createSession(user);
  redirect("/");
}
