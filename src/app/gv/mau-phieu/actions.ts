"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser, type CurrentUser } from "@/lib/auth";
import { parseQuestions } from "@/lib/questions";

export type TemplateState = { error?: string; ok?: string } | null;

function canEdit(user: CurrentUser, t: { ownerId: string | null }) {
  return user.role === "ADMIN" || t.ownerId === user.id;
}

export async function saveTemplateAction(templateId: string | null, _prev: TemplateState, formData: FormData): Promise<TemplateState> {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const name = String(formData.get("name") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000) || null;
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("questions") ?? "[]"));
  } catch {
    return { error: "Dữ liệu câu hỏi không hợp lệ." };
  }
  const questions = parseQuestions(raw);
  if (!name) return { error: "Vui lòng nhập tên mẫu phiếu." };
  if (questions.length === 0) return { error: "Mẫu phiếu cần ít nhất một câu hỏi (câu trắc nghiệm cần ít nhất 2 lựa chọn)." };
  if (Array.isArray(raw) && questions.length < raw.length) {
    return { error: "Có câu hỏi chưa có nội dung, hoặc câu trắc nghiệm có ít hơn 2 lựa chọn. Vui lòng kiểm tra lại." };
  }
  const isShared = user.role === "ADMIN" && formData.get("isShared") === "on";

  if (templateId) {
    const t = await prisma.formTemplate.findUnique({ where: { id: templateId } });
    if (!t || !canEdit(user, t)) notFound();
    await prisma.formTemplate.update({ where: { id: templateId }, data: { name, description, questions, isShared } });
    revalidatePath("/gv/mau-phieu", "layout");
    return { ok: "Đã lưu mẫu phiếu. Các đợt tạo từ nay sẽ dùng nội dung mới; đợt cũ giữ nguyên." };
  }
  const t = await prisma.formTemplate.create({ data: { name, description, questions, isShared, ownerId: user.id } });
  revalidatePath("/gv/mau-phieu");
  redirect(`/gv/mau-phieu/${t.id}`);
}

export async function duplicateTemplateAction(templateId: string) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const t = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!t || !(t.isShared || canEdit(user, t))) notFound();
  const copy = await prisma.formTemplate.create({
    data: {
      name: `${t.name} (bản sao)`,
      description: t.description,
      questions: parseQuestions(t.questions),
      ownerId: user.id,
    },
  });
  redirect(`/gv/mau-phieu/${copy.id}`);
}

export async function deleteTemplateAction(templateId: string) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const t = await prisma.formTemplate.findUnique({ where: { id: templateId } });
  if (!t || !canEdit(user, t)) notFound();
  // Các đợt đã tạo vẫn giữ bản chụp câu hỏi nên xóa mẫu không ảnh hưởng dữ liệu cũ
  await prisma.formTemplate.delete({ where: { id: templateId } });
  revalidatePath("/gv/mau-phieu");
  redirect("/gv/mau-phieu");
}
