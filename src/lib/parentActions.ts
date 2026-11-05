"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "./db";
import { requireClassAccess, requireStudentAccess } from "./auth";
import { regenerateParentToken } from "./parent";

/** Ghi lại thời điểm giáo viên bấm nhắn/sao chép tin cho phụ huynh. */
export async function markParentNotifiedAction(feedbackId: string) {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { published: true, response: { select: { surveyId: true, studentId: true, survey: { select: { classId: true } } } } },
  });
  if (!feedback) notFound();
  await requireClassAccess(feedback.response.survey.classId);
  if (!feedback.published) return;
  await prisma.feedback.update({ where: { id: feedbackId }, data: { parentNotifiedAt: new Date() } });
  revalidatePath(`/gv/dot/${feedback.response.surveyId}`, "layout");
}

export async function regenerateParentLinkAction(studentId: string) {
  await requireStudentAccess(studentId);
  await regenerateParentToken(studentId);
  revalidatePath(`/gv/hoc-sinh/${studentId}`);
}
