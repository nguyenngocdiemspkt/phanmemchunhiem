"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, randomPassword, requireUser } from "@/lib/auth";

export type CreateTeacherState = { error?: string; ok?: string; password?: string; username?: string } | null;

export async function createTeacherAction(_prev: CreateTeacherState, formData: FormData): Promise<CreateTeacherState> {
  await requireUser(["ADMIN"]);
  const fullName = String(formData.get("fullName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const role = formData.get("role") === "ADMIN" ? "ADMIN" : "TEACHER";

  if (!fullName) return { error: "Vui lòng nhập họ tên." };
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return { error: "Tên đăng nhập 3–40 ký tự, chỉ gồm chữ thường không dấu, số, dấu chấm, gạch." };
  }
  if (await prisma.user.findUnique({ where: { username } })) return { error: `Tên đăng nhập "${username}" đã tồn tại.` };

  const password = randomPassword();
  await prisma.user.create({
    data: { fullName, username, phone, email, role, passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  revalidatePath("/admin/giao-vien");
  return { ok: `Đã tạo tài khoản cho ${fullName}.`, username, password };
}
