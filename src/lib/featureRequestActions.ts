"use server";

import { revalidatePath } from "next/cache";
import type { FeatureRequestStatus } from "@prisma/client";
import { prisma } from "./db";
import { requireStudent, requireUser } from "./auth";
import { audit } from "./audit";

export type FeatureRequestState = { error?: string; ok?: string } | null;

const STATUSES: FeatureRequestStatus[] = ["NEW", "PLANNED", "DONE", "DECLINED"];
const MAX_OPEN_PER_STUDENT = 10;

/** Chỉ học sinh gửi đề xuất chức năng mới */
export async function createFeatureRequestAction(_prev: FeatureRequestState, formData: FormData): Promise<FeatureRequestState> {
  const { user, student } = await requireStudent();
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "").trim().slice(0, 3000);
  if (!title) return { error: "Em hãy đặt tên cho chức năng." };
  if (description.length < 10) return { error: "Em hãy mô tả rõ hơn chức năng em mong muốn (ít nhất 10 ký tự)." };
  // Chống gửi quá nhiều đề xuất đang chờ xem xét
  const open = await prisma.featureRequest.count({ where: { studentId: student.id, status: "NEW" } });
  if (open >= MAX_OPEN_PER_STUDENT) return { error: `Em đang có ${open} đề xuất chờ xem xét, hãy đợi nhà trường phản hồi trước nhé.` };
  const req = await prisma.featureRequest.create({
    data: { studentId: student.id, authorName: user.fullName, className: student.classroom.name, title, description },
  });
  await audit(user, "feature.create", { entity: "FeatureRequest", entityId: req.id, classId: student.classId, summary: `${user.fullName} đề xuất chức năng "${title}"` });
  revalidatePath("/hs/de-xuat");
  revalidatePath("/admin/de-xuat");
  return { ok: "Cảm ơn em! Đề xuất đã được gửi tới nhà trường." };
}

/** Quản trị đổi trạng thái và ghi phản hồi cho đề xuất */
export async function updateFeatureRequestAction(id: string, _prev: FeatureRequestState, formData: FormData): Promise<FeatureRequestState> {
  const user = await requireUser(["ADMIN"]);
  const status = String(formData.get("status") ?? "") as FeatureRequestStatus;
  if (!STATUSES.includes(status)) return { error: "Trạng thái không hợp lệ." };
  const adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 2000) || null;
  const req = await prisma.featureRequest.update({ where: { id }, data: { status, adminNote } });
  await audit(user, "feature.update", { entity: "FeatureRequest", entityId: id, summary: `Cập nhật đề xuất "${req.title}": ${status}` });
  revalidatePath("/admin/de-xuat");
  revalidatePath("/hs/de-xuat");
  return { ok: "Đã lưu." };
}
