"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireUser } from "./auth";

export type AvatarState = { error?: string; ok?: string } | null;

// Ảnh đã được thu nhỏ trên máy người dùng (~256px) nên chỉ vài chục KB
const MAX_BYTES = 200 * 1024;
const TYPES = ["image/jpeg", "image/webp", "image/png"];

/** Người dùng tự cập nhật ảnh đại diện của mình. Ảnh gửi lên dạng data URL. */
export async function saveAvatarAction(_prev: AvatarState, formData: FormData): Promise<AvatarState> {
  const user = await requireUser();
  const m = String(formData.get("image") ?? "").match(/^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || !TYPES.includes(m[1])) return { error: "Vui lòng chọn ảnh (JPG, PNG hoặc WebP)." };
  const data = Buffer.from(m[2], "base64");
  if (data.length === 0 || data.length > MAX_BYTES) return { error: "Ảnh quá lớn, vui lòng chọn ảnh khác." };
  const now = new Date();
  await prisma.$transaction([
    prisma.userAvatar.upsert({
      where: { userId: user.id },
      create: { userId: user.id, data, type: m[1] },
      update: { data, type: m[1] },
    }),
    prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: now } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: "Đã cập nhật ảnh đại diện." };
}

export async function removeAvatarAction() {
  const user = await requireUser();
  await prisma.$transaction([
    prisma.userAvatar.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: null } }),
  ]);
  revalidatePath("/", "layout");
}
