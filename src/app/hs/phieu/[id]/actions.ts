"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { surveyStatus } from "@/lib/format";
import { computeScore, findUrgentKeywords, parseQuestions, type Answers } from "@/lib/questions";

export type SubmitState = { error?: string } | null;

export async function submitResponseAction(surveyId: string, _prev: SubmitState, formData: FormData): Promise<SubmitState> {
  const { student } = await requireStudent();
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey || survey.classId !== student.classId) return { error: "Không tìm thấy phiếu." };
  if (surveyStatus(survey) !== "open") return { error: "Phiếu đã đóng hoặc chưa mở, em không thể nộp lúc này." };

  const questions = parseQuestions(survey.questions);
  const answers: Answers = {};
  for (const q of questions) {
    const value = String(formData.get(`q_${q.id}`) ?? "").trim();
    if (q.type === "single") {
      if (value && q.options?.some((o) => o.id === value)) answers[q.id] = value;
    } else if (value) {
      answers[q.id] = value.slice(0, 3000);
    }
    if (q.required && !answers[q.id]) return { error: `Em chưa trả lời câu: "${q.text}"` };
  }

  const score = computeScore(questions, answers);
  const urgent = findUrgentKeywords(questions, answers).length > 0;
  await prisma.response.upsert({
    where: { surveyId_studentId: { surveyId, studentId: student.id } },
    create: { surveyId, studentId: student.id, answers, score, urgent },
    update: { answers, score, urgent, submittedAt: new Date() },
  });
  redirect("/hs?da-nop=1");
}
