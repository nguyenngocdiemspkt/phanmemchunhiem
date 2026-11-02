"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStudentAccess } from "@/lib/auth";
import { fromDateInput } from "@/lib/format";

export type ProfileState = { error?: string; ok?: string } | null;

export async function updateProfileAction(studentId: string, _prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { student } = await requireStudentAccess(studentId);
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const fullName = get("fullName");
  if (!fullName) return { error: "Họ tên không được để trống." };
  await prisma.user.update({
    where: { id: student.userId },
    data: {
      fullName,
      student: {
        update: {
          studentCode: get("studentCode"),
          dateOfBirth: get("dateOfBirth"),
          gender: get("gender"),
          address: get("address"),
          parentName: get("parentName"),
          parentPhone: get("parentPhone"),
        },
      },
    },
  });
  revalidatePath(`/gv/hoc-sinh/${studentId}`);
  return { ok: "Đã lưu thông tin." };
}

export async function addNoteAction(studentId: string, _prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { user } = await requireStudentAccess(studentId);
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  const rawType = String(formData.get("type"));
  const type = rawType === "PROGRESS" ? "PROGRESS" : rawType === "CONCERN" ? "CONCERN" : "POSITIVE";
  const date = fromDateInput(String(formData.get("date") ?? "")) ?? new Date();
  if (!content) return { error: "Vui lòng nhập nội dung ghi nhận." };
  await prisma.note.create({
    data: {
      studentId,
      authorId: user.id,
      type,
      content,
      date,
      // Ghi chú "cần quan tâm" luôn chỉ giáo viên thấy
      visibleToStudent: type !== "CONCERN" && formData.get("visibleToStudent") === "on",
    },
  });
  revalidatePath(`/gv/hoc-sinh/${studentId}`);
  return { ok: "Đã thêm ghi nhận." };
}

export async function deleteNoteAction(studentId: string, noteId: string) {
  await requireStudentAccess(studentId);
  await prisma.note.deleteMany({ where: { id: noteId, studentId } });
  revalidatePath(`/gv/hoc-sinh/${studentId}`);
}
