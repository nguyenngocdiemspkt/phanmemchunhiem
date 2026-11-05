"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hashPassword, randomPassword, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export type CreateTeacherState = { error?: string; ok?: string; password?: string; username?: string } | null;
export type UpdateTeacherState = { error?: string; ok?: string } | null;

const ROLE_LABEL = { ADMIN: "Quản trị", TEACHER: "Giáo viên" } as const;

function readContact(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    role: formData.get("role") === "ADMIN" ? ("ADMIN" as const) : ("TEACHER" as const),
  };
}

export async function createTeacherAction(_prev: CreateTeacherState, formData: FormData): Promise<CreateTeacherState> {
  const actor = await requireUser(["ADMIN"]);
  const { fullName, phone, email, role } = readContact(formData);
  const username = String(formData.get("username") ?? "").trim().toLowerCase();

  if (!fullName) return { error: "Vui lòng nhập họ tên." };
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    return { error: "Tên đăng nhập 3–40 ký tự, chỉ gồm chữ thường không dấu, số, dấu chấm, gạch." };
  }
  if (await prisma.user.findUnique({ where: { username } })) return { error: `Tên đăng nhập "${username}" đã tồn tại.` };

  const password = randomPassword();
  const user = await prisma.user.create({
    data: { fullName, username, phone, email, role, passwordHash: await hashPassword(password), mustChangePassword: true },
  });
  await audit(actor, "teacher.create", {
    entity: "User",
    entityId: user.id,
    summary: `Tạo tài khoản ${ROLE_LABEL[role].toLowerCase()} ${fullName} (${username})`,
  });
  revalidatePath("/admin/giao-vien");
  return { ok: `Đã tạo tài khoản cho ${fullName}.`, username, password };
}

export async function updateTeacherAction(userId: string, _prev: UpdateTeacherState, formData: FormData): Promise<UpdateTeacherState> {
  const actor = await requireUser(["ADMIN"]);
  const before = await prisma.user.findFirst({ where: { id: userId, role: { in: ["TEACHER", "ADMIN"] } } });
  if (!before) return { error: "Không tìm thấy tài khoản." };
  const data = readContact(formData);
  if (!data.fullName) return { error: "Vui lòng nhập họ tên." };
  if (userId === actor.id && data.role !== "ADMIN") return { error: "Không thể tự bỏ quyền quản trị của chính mình." };

  await prisma.user.update({ where: { id: userId }, data });
  const changes = (["fullName", "phone", "email", "role"] as const)
    .filter((k) => (before[k] ?? null) !== (data[k] ?? null))
    .map((k) => `${k}: ${before[k] ?? "(trống)"} → ${data[k] ?? "(trống)"}`);
  if (changes.length) {
    await audit(actor, "teacher.update", {
      entity: "User",
      entityId: userId,
      summary: `Sửa tài khoản ${data.fullName}: ${changes.join("; ")}`,
    });
  }
  revalidatePath("/admin/giao-vien");
  return { ok: "Đã lưu." };
}
