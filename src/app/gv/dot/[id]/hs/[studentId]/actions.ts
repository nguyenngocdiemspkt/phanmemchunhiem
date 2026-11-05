"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { countsFromForm, parseCriteria } from "@/lib/scoring";
import { recomputePoints } from "@/lib/scoreService";

export type FeedbackState = { error?: string; ok?: string } | null;

function revalidateReview(surveyId: string) {
  revalidatePath(`/gv/dot/${surveyId}`, "layout");
  revalidatePath("/hs", "layout");
  revalidatePath("/gv/lop", "layout");
}

/**
 * Nhận xét và duyệt phiếu. intent:
 * - draft: lưu nháp nhận xét
 * - approve: duyệt = khóa phiếu (HS không sửa được) + công bố kết quả và nhận xét cho HS, phụ huynh
 * - revision: yêu cầu HS sửa (kèm lời nhắn), thu hồi công bố nếu có
 * - unapprove: hủy duyệt, phiếu quay về chờ duyệt
 */
export async function saveFeedbackAction(responseId: string, _prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const response = await prisma.response.findUnique({
    where: { id: responseId },
    include: { survey: true, student: { include: { user: { select: { fullName: true } } } } },
  });
  if (!response) notFound();
  const { user } = await requireClassAccess(response.survey.classId);

  const content = String(formData.get("content") ?? "").trim().slice(0, 5000);
  const goals = formData
    .getAll("goal")
    .map((g) => String(g).trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, 5);
  const intent = String(formData.get("intent") ?? "draft");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim().slice(0, 1000);

  if (intent === "approve") {
    const pending = await prisma.scoreReport.count({ where: { surveyId: response.surveyId, studentId: response.studentId, status: "PENDING" } });
    if (pending > 0) return { error: `Còn ${pending} bổ sung của tổ trưởng chưa xác nhận. Hãy chấp nhận hoặc bỏ qua trước khi duyệt.` };
  }
  if (intent === "revision" && !reviewNote) return { error: "Vui lòng ghi lời nhắn: em cần sửa/bổ sung điều gì." };

  const published = intent === "approve";
  const feedbackData = {
    content,
    goals,
    teacherId: user.id,
    ...(intent === "draft" ? {} : { published, publishedAt: published ? new Date() : null }),
  };
  const status = intent === "approve" ? "APPROVED" : intent === "revision" ? "REVISION" : intent === "unapprove" ? "SUBMITTED" : null;
  await prisma.$transaction([
    prisma.feedback.upsert({ where: { responseId }, create: { responseId, ...feedbackData, published }, update: feedbackData }),
    ...(status
      ? [
          prisma.response.update({
            where: { id: responseId },
            data: { status, reviewedAt: new Date(), reviewNote: intent === "revision" ? reviewNote : intent === "approve" ? null : undefined },
          }),
        ]
      : []),
  ]);
  if (status) {
    const label = { APPROVED: "Duyệt và công bố", REVISION: "Yêu cầu sửa", SUBMITTED: "Hủy duyệt" }[status];
    await audit(user, `survey.${intent}`, {
      entity: "Response",
      entityId: responseId,
      classId: response.survey.classId,
      summary: `${label} phiếu "${response.survey.title}" của ${response.student.user.fullName}${intent === "revision" ? `: ${reviewNote}` : ""}`,
    });
  }
  revalidateReview(response.surveyId);
  return {
    ok:
      intent === "approve"
        ? "Đã duyệt: phiếu được khóa, học sinh và phụ huynh xem được kết quả. Có thể báo phụ huynh ở khung bên dưới."
        : intent === "revision"
          ? "Đã gửi yêu cầu sửa cho học sinh."
          : intent === "unapprove"
            ? "Đã hủy duyệt, học sinh không còn thấy kết quả."
            : "Đã lưu bản nháp.",
  };
}

/**
 * GV chốt số lần theo từng tiêu chí. Nếu học sinh chưa nộp, GV chấm thay (tạo phiếu không có câu trả lời).
 */
export async function saveScoresAction(surveyId: string, studentId: string, _prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey) notFound();
  const { user } = await requireClassAccess(survey.classId);
  const student = await prisma.student.findFirst({ where: { id: studentId, classId: survey.classId }, include: { user: { select: { fullName: true } } } });
  if (!student) return { error: "Không tìm thấy học sinh." };
  const criteria = parseCriteria(survey.criteria);
  if (criteria.length === 0) return { error: "Đợt này không chấm điểm theo tiêu chí." };
  const parsed = countsFromForm(criteria, formData, "t_");
  if ("error" in parsed) return { error: parsed.error };
  const counts = parsed.counts;
  // Lưu đủ mọi tiêu chí (kể cả 0) để số GV chốt thay hẳn số tự khai
  const teacherCounts = Object.fromEntries(criteria.map((c) => [c.id, counts[c.id] ?? 0]));

  const response = await prisma.response.upsert({
    where: { surveyId_studentId: { surveyId, studentId } },
    create: { surveyId, studentId, answers: {}, selfCounts: {}, teacherCounts },
    update: { teacherCounts },
  });
  const points = await recomputePoints(prisma, response.id);
  await audit(user, "survey.score", {
    entity: "Response",
    entityId: response.id,
    classId: survey.classId,
    summary: `Chốt điểm thi đua "${survey.title}" của ${student.user.fullName}: ${points} điểm`,
    detail: Object.fromEntries(criteria.filter((c) => teacherCounts[c.id]).map((c) => [c.name, teacherCounts[c.id]])),
  });
  revalidateReview(surveyId);
  return { ok: `Đã lưu. Điểm tuần: ${points}.` };
}

/** Bỏ số GV đã chốt, quay về tự khai + bổ sung đã chấp nhận */
export async function resetScoresAction(responseId: string) {
  const response = await prisma.response.findUnique({ where: { id: responseId }, include: { survey: true } });
  if (!response) return;
  await requireClassAccess(response.survey.classId);
  await prisma.response.update({ where: { id: responseId }, data: { teacherCounts: Prisma.DbNull } });
  await recomputePoints(prisma, responseId);
  revalidateReview(response.surveyId);
}

/** GV chấp nhận hoặc bỏ qua bổ sung của tổ trưởng */
export async function decideReportAction(reportId: string, accept: boolean) {
  const report = await prisma.scoreReport.findUnique({
    where: { id: reportId },
    include: { survey: true, student: { include: { user: { select: { fullName: true } } } } },
  });
  if (!report) return;
  const { user } = await requireClassAccess(report.survey.classId);
  await prisma.$transaction(async (tx) => {
    await tx.scoreReport.update({
      where: { id: reportId },
      data: { status: accept ? "ACCEPTED" : "REJECTED", decidedById: user.id, decidedAt: new Date() },
    });
    const response = await tx.response.findUnique({ where: { surveyId_studentId: { surveyId: report.surveyId, studentId: report.studentId } } });
    if (!response) return;
    // GV đã chốt số lần của tiêu chí này thì cộng thêm vào số đã chốt
    if (accept && report.criterionId && response.teacherCounts && typeof response.teacherCounts === "object") {
      const tc = { ...(response.teacherCounts as Record<string, number>) };
      if (report.criterionId in tc) {
        tc[report.criterionId] = (tc[report.criterionId] ?? 0) + report.times;
        await tx.response.update({ where: { id: response.id }, data: { teacherCounts: tc } });
      }
    }
    await recomputePoints(tx, response.id);
  });
  await audit(user, accept ? "survey.report.accept" : "survey.report.reject", {
    entity: "ScoreReport",
    entityId: reportId,
    classId: report.survey.classId,
    summary: `${accept ? "Chấp nhận" : "Bỏ qua"} bổ sung của tổ trưởng ${report.reporterName} cho ${report.student.user.fullName}: ${
      report.criterionName ? `${report.criterionName} × ${report.times}` : "nhận xét"
    }${report.note ? ` (${report.note})` : ""}`,
  });
  revalidateReview(report.surveyId);
}
