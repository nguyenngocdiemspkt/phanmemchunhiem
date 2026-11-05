"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { MAX_TIMES, parseCriteria } from "@/lib/scoring";

export type ReportState = { error?: string; ok?: string } | null;

async function requireLeader() {
  const { user, student } = await requireStudent();
  if (!student.isGroupLeader || !student.groupNo) return null;
  return { user, student };
}

/**
 * Tổ trưởng nhận xét hoặc đề xuất bổ sung vi phạm cho tổ viên trong tổ mình.
 * Đề xuất ở trạng thái chờ, GV chấp nhận mới tính điểm và học sinh mới thấy.
 */
export async function addReportAction(surveyId: string, studentId: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const leader = await requireLeader();
  if (!leader) return { error: "Chỉ tổ trưởng mới dùng được chức năng này." };
  const { user, student: me } = leader;
  const survey = await prisma.survey.findUnique({ where: { id: surveyId } });
  if (!survey || survey.classId !== me.classId) return { error: "Không tìm thấy phiếu." };
  const target = await prisma.student.findFirst({
    where: { id: studentId, classId: me.classId, groupNo: me.groupNo, status: "ACTIVE" },
    include: { user: { select: { fullName: true } } },
  });
  if (!target || target.id === me.id) return { error: "Em chỉ ghi nhận được cho các bạn trong tổ mình." };
  const response = await prisma.response.findUnique({ where: { surveyId_studentId: { surveyId, studentId } }, select: { status: true } });
  if (response?.status === "APPROVED") return { error: "Phiếu của bạn đã được thầy/cô duyệt." };

  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  const criterionId = String(formData.get("criterionId") ?? "");
  let data: { criterionId: string | null; criterionName: string | null; points: number; times: number };
  if (criterionId) {
    const criterion = parseCriteria(survey.criteria).find((c) => c.id === criterionId);
    if (!criterion) return { error: "Tiêu chí không hợp lệ." };
    const times = Number(formData.get("times"));
    if (!Number.isInteger(times) || times < 1 || times > MAX_TIMES) return { error: `Số lần từ 1 đến ${MAX_TIMES}.` };
    data = { criterionId, criterionName: criterion.name, points: criterion.points, times };
  } else {
    if (!note) return { error: "Em hãy viết nội dung nhận xét." };
    data = { criterionId: null, criterionName: null, points: 0, times: 0 };
  }

  await prisma.scoreReport.create({
    data: { surveyId, studentId, reporterId: me.id, reporterName: user.fullName, note: note || null, ...data },
  });
  await audit(user, "survey.report", {
    entity: "Student",
    entityId: studentId,
    classId: me.classId,
    summary: `Tổ trưởng ${user.fullName} ${data.criterionName ? `bổ sung "${data.criterionName}" × ${data.times}` : "nhận xét"} cho ${target.user.fullName} (đợt "${survey.title}")`,
  });
  revalidatePath("/hs/to-truong");
  revalidatePath(`/gv/dot/${surveyId}`, "layout");
  return { ok: "Đã gửi, chờ thầy/cô xác nhận." };
}

/** Tổ trưởng rút lại ghi nhận của mình khi GV chưa xác nhận */
export async function deleteReportAction(reportId: string) {
  const leader = await requireLeader();
  if (!leader) return;
  await prisma.scoreReport.deleteMany({ where: { id: reportId, reporterId: leader.student.id, status: "PENDING" } });
  revalidatePath("/hs/to-truong");
}
