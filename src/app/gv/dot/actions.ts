"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClassAccess, requireUser } from "@/lib/auth";
import { fromLocalInput } from "@/lib/format";
import { parseQuestions } from "@/lib/questions";

export type SurveyFormState = { error?: string; ok?: string } | null;

function readTimes(formData: FormData) {
  const openAt = fromLocalInput(String(formData.get("openAt") ?? ""));
  const closeAt = fromLocalInput(String(formData.get("closeAt") ?? ""));
  if (!openAt || !closeAt) return { error: "Vui lòng nhập đầy đủ thời gian mở và đóng phiếu." } as const;
  if (closeAt <= openAt) return { error: "Thời gian đóng phải sau thời gian mở." } as const;
  return { openAt, closeAt } as const;
}

export async function createSurveyAction(_prev: SurveyFormState, formData: FormData): Promise<SurveyFormState> {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Vui lòng nhập tên đợt." };
  const times = readTimes(formData);
  if ("error" in times) return { error: times.error };

  const template = await prisma.formTemplate.findUnique({ where: { id: String(formData.get("templateId") ?? "") } });
  if (!template || !(template.isShared || template.ownerId === user.id || user.role === "ADMIN")) {
    return { error: "Vui lòng chọn mẫu phiếu." };
  }
  const questions = parseQuestions(template.questions);
  if (questions.length === 0) return { error: "Mẫu phiếu chưa có câu hỏi hợp lệ." };

  const classIds = [...new Set(formData.getAll("classIds").map(String))];
  if (classIds.length === 0) return { error: "Vui lòng chọn ít nhất một lớp." };
  for (const classId of classIds) await requireClassAccess(classId);

  await prisma.survey.createMany({
    data: classIds.map((classId) => ({
      classId,
      title,
      templateId: template.id,
      questions,
      openAt: times.openAt,
      closeAt: times.closeAt,
    })),
  });
  for (const classId of classIds) revalidatePath(`/gv/lop/${classId}`, "layout");
  return { ok: `Đã tạo đợt "${title}" cho ${classIds.length} lớp.` };
}

async function requireSurvey(surveyId: string) {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) redirect("/gv");
  await requireClassAccess(survey.classId);
  return survey;
}

export async function updateSurveyAction(surveyId: string, _prev: SurveyFormState, formData: FormData): Promise<SurveyFormState> {
  const survey = await requireSurvey(surveyId);
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Vui lòng nhập tên đợt." };
  const times = readTimes(formData);
  if ("error" in times) return { error: times.error };
  await prisma.survey.update({ where: { id: survey.id }, data: { title, openAt: times.openAt, closeAt: times.closeAt } });
  revalidatePath(`/gv/dot/${surveyId}`);
  revalidatePath(`/gv/lop/${survey.classId}`, "layout");
  return { ok: "Đã lưu." };
}

/** Đóng phiếu ngay lập tức */
export async function closeSurveyNowAction(surveyId: string) {
  const survey = await requireSurvey(surveyId);
  const now = new Date();
  await prisma.survey.update({
    where: { id: survey.id },
    data: { closeAt: now, openAt: survey.openAt > now ? now : survey.openAt },
  });
  revalidatePath(`/gv/dot/${surveyId}`);
}

export async function deleteSurveyAction(surveyId: string) {
  const survey = await requireSurvey(surveyId);
  await prisma.survey.delete({ where: { id: survey.id } });
  revalidatePath(`/gv/lop/${survey.classId}`, "layout");
  redirect(`/gv/lop/${survey.classId}/dot`);
}
