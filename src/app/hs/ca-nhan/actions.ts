"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { classLockedMessage } from "@/lib/schoolYear";

export type SelfProfileState = { error?: string; ok?: string } | null;

/**
 * Học sinh tự cập nhật địa chỉ. Các thông tin còn lại (mã HS, ngày sinh, SĐT phụ huynh nhận
 * thông báo...) do giáo viên chủ nhiệm quản lý.
 */
export async function updateOwnAddressAction(_prev: SelfProfileState, formData: FormData): Promise<SelfProfileState> {
  const { user, student } = await requireStudent();
  const locked = await classLockedMessage(student.classroom);
  if (locked) return { error: locked };
  const address = String(formData.get("address") ?? "").trim().slice(0, 300) || null;
  if (address === student.address) return { ok: "Không có thay đổi." };
  await prisma.student.update({ where: { id: student.id }, data: { address } });
  await audit(user, "student.self-update", {
    entity: "Student",
    entityId: student.id,
    classId: student.classId,
    summary: `${user.fullName} tự sửa địa chỉ: ${student.address ?? "(trống)"} → ${address ?? "(trống)"}`,
  });
  revalidatePath("/hs/ca-nhan");
  return { ok: "Đã lưu địa chỉ." };
}
