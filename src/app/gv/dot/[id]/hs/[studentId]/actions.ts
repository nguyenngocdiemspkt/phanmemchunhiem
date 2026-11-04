"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";

export type FeedbackState = { error?: string; ok?: string } | null;

export async function saveFeedbackAction(responseId: string, _prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const response = await prisma.response.findUnique({ where: { id: responseId }, include: { survey: true } });
  if (!response) notFound();
  const { user } = await requireClassAccess(response.survey.classId);

  const content = String(formData.get("content") ?? "").trim().slice(0, 5000);
  const goals = formData
    .getAll("goal")
    .map((g) => String(g).trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 5);
  const intent = String(formData.get("intent") ?? "draft");
  if (intent === "publish" && !content) return { error: "Vui lòng viết nhận xét trước khi gửi." };

  const published = intent === "publish";
  const data = {
    content,
    goals,
    teacherId: user.id,
    published,
    publishedAt: published ? new Date() : null,
  };
  await prisma.feedback.upsert({ where: { responseId }, create: { responseId, ...data }, update: data });
  revalidatePath(`/gv/dot/${response.surveyId}`, "layout");
  revalidatePath("/hs", "layout");
  return { ok: published ? "Đã gửi nhận xét cho học sinh. Có thể báo phụ huynh ở khung bên dưới." : intent === "unpublish" ? "Đã thu hồi, học sinh không còn thấy nhận xét." : "Đã lưu bản nháp." };
}
