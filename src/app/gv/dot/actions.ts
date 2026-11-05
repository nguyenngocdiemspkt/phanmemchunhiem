"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClassAccess, requireUser } from "@/lib/auth";
import { fromLocalInput } from "@/lib/format";
import { parseQuestions } from "@/lib/questions";
import { ensureCategories } from "@/lib/emulation";
import { audit } from "@/lib/audit";

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
  const classrooms = [];
  for (const classId of classIds) classrooms.push((await requireClassAccess(classId)).classroom);

  // Chấm điểm theo tiêu chí: chụp bộ tiêu chí riêng của từng lớp vào đợt
  const scoring = formData.get("scoring") === "on";
  const data = [];
  for (const c of classrooms) {
    const criteria = scoring ? (await ensureCategories(c.id)).map((x) => ({ id: x.id, name: x.name, points: x.points })) : null;
    data.push({
      classId: c.id,
      title,
      templateId: template.id,
      questions,
      openAt: times.openAt,
      closeAt: times.closeAt,
      ...(criteria ? { criteria, baseScore: c.baseScore } : {}),
    });
  }
  await prisma.survey.createMany({ data });
  for (const c of classrooms) {
    await audit(user, "survey.create", {
      entity: "Classroom",
      entityId: c.id,
      classId: c.id,
      summary: `Tạo đợt "${title}" cho lớp ${c.name}${scoring ? " (có chấm điểm theo tiêu chí)" : ""}`,
    });
  }
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
  const user = await requireUser(["TEACHER", "ADMIN"]);
  // Phiếu đã duyệt không bị xóa nếu không có quyền quản trị
  const approved = await prisma.response.count({ where: { surveyId, status: "APPROVED" } });
  if (approved > 0 && user.role !== "ADMIN") return;
  const total = await prisma.response.count({ where: { surveyId } });
  await audit(user, "survey.delete", {
    entity: "Survey",
    entityId: surveyId,
    classId: survey.classId,
    summary: `Xóa đợt "${survey.title}" (${total} phiếu, ${approved} đã duyệt)`,
  });
  await prisma.survey.delete({ where: { id: survey.id } });
  revalidatePath(`/gv/lop/${survey.classId}`, "layout");
  redirect(`/gv/lop/${survey.classId}/dot`);
}

export type ApproveAllState = { error?: string; ok?: string } | null;

/**
 * Duyệt hàng loạt các phiếu đang chờ duyệt: khóa phiếu + công bố. Phiếu còn bổ sung của tổ trưởng
 * chưa xác nhận thì bỏ qua để GV xem riêng.
 */
export async function approveAllAction(surveyId: string, _prev: ApproveAllState): Promise<ApproveAllState> {
  const survey = await requireSurvey(surveyId);
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const [waiting, pendingReports] = await Promise.all([
    prisma.response.findMany({ where: { surveyId, status: "SUBMITTED" }, select: { id: true, studentId: true } }),
    prisma.scoreReport.findMany({ where: { surveyId, status: "PENDING" }, select: { studentId: true } }),
  ]);
  const blocked = new Set(pendingReports.map((r) => r.studentId));
  const ready = waiting.filter((r) => !blocked.has(r.studentId));
  if (ready.length === 0) {
    return { error: waiting.length ? "Các phiếu chờ duyệt đều còn bổ sung của tổ trưởng chưa xác nhận." : "Không có phiếu nào đang chờ duyệt." };
  }
  const now = new Date();
  await prisma.$transaction([
    prisma.response.updateMany({ where: { id: { in: ready.map((r) => r.id) } }, data: { status: "APPROVED", reviewedAt: now, reviewNote: null } }),
    ...ready.map((r) =>
      prisma.feedback.upsert({
        where: { responseId: r.id },
        create: { responseId: r.id, content: "", goals: [], teacherId: user.id, published: true, publishedAt: now },
        update: { published: true, publishedAt: now, teacherId: user.id },
      }),
    ),
  ]);
  await audit(user, "survey.approve-all", {
    entity: "Survey",
    entityId: surveyId,
    classId: survey.classId,
    summary: `Duyệt hàng loạt ${ready.length} phiếu đợt "${survey.title}"`,
  });
  revalidatePath(`/gv/dot/${surveyId}`, "layout");
  revalidatePath("/hs", "layout");
  const skipped = waiting.length - ready.length;
  return { ok: `Đã duyệt ${ready.length} phiếu.${skipped ? ` Còn ${skipped} phiếu có bổ sung của tổ trưởng chờ xác nhận.` : ""}` };
}
