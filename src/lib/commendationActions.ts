"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireClassAccess, requireStudent } from "./auth";
import { audit } from "./audit";
import { weekStart } from "./format";
import { classLockedMessage } from "./schoolYear";
import { filterText } from "./badWords";

export type CommendState = { error?: string; ok?: string } | null;
const REASON_MAX = 200;

function revalidate(classId: string) {
  revalidatePath("/hs/binh-chon");
  revalidatePath(`/gv/lop/${classId}/binh-chon`);
}

/** Học sinh bầu (hoặc đổi phiếu) tuyên dương 1 bạn cùng lớp cho tuần hiện tại */
export async function voteCommendationAction(_prev: CommendState, formData: FormData): Promise<CommendState> {
  const { student } = await requireStudent();
  if (student.status !== "ACTIVE") return { error: "Tài khoản của em không còn đang học." };
  const locked = await classLockedMessage(student.classroom);
  if (locked) return { error: locked };
  const nomineeId = String(formData.get("nomineeId") ?? "");
  if (!nomineeId) return { error: "Em hãy chọn một bạn để tuyên dương." };
  if (nomineeId === student.id) return { error: "Em không tự bầu cho mình được, hãy chọn một bạn khác nhé." };
  const nominee = await prisma.student.findFirst({
    where: { id: nomineeId, classId: student.classId, status: "ACTIVE" },
    select: { id: true, user: { select: { fullName: true } } },
  });
  if (!nominee) return { error: "Bạn này không thuộc lớp em." };
  const raw = String(formData.get("reason") ?? "").replace(/\s+/g, " ").trim().slice(0, REASON_MAX);
  const reason = raw ? filterText(raw) : null;
  const week = weekStart(new Date());
  await prisma.commendationVote.upsert({
    where: { voterId_weekStart: { voterId: student.id, weekStart: week } },
    create: { classId: student.classId, weekStart: week, voterId: student.id, nomineeId: nominee.id, reason },
    update: { nomineeId: nominee.id, reason },
  });
  revalidate(student.classId);
  return { ok: `Em đã bầu tuyên dương ${nominee.user.fullName} tuần này. Em có thể đổi phiếu đến hết Chủ nhật.` };
}

/** GVCN xóa một phiếu bầu (ví dụ lý do không phù hợp); nội dung được ghi vào nhật ký */
export async function deleteCommendationVoteAction(classId: string, voteId: string) {
  const { user, classroom } = await requireClassAccess(classId);
  const vote = await prisma.commendationVote.findFirst({
    where: { id: voteId, classId },
    include: { voter: { select: { user: { select: { fullName: true } } } }, nominee: { select: { user: { select: { fullName: true } } } } },
  });
  if (!vote) return;
  await prisma.commendationVote.delete({ where: { id: voteId } });
  await audit(user, "class.commend.delete", {
    classId,
    entity: "CommendationVote",
    entityId: voteId,
    summary: `Lớp ${classroom.name}: xóa phiếu tuyên dương của ${vote.voter.user.fullName} cho ${vote.nominee.user.fullName}${vote.reason ? `: "${vote.reason.slice(0, 120)}"` : ""}`,
  });
  revalidate(classId);
}

/** GVCN đặt số điểm cộng cho bạn được tuyên dương tuần (0 = không cộng) */
export async function setCommendPointsAction(classId: string, _prev: CommendState, formData: FormData): Promise<CommendState> {
  const { user, classroom } = await requireClassAccess(classId);
  const locked = await classLockedMessage(classroom);
  if (locked) return { error: locked };
  const n = Number(formData.get("commendPoints"));
  if (!Number.isInteger(n) || n < 0 || n > 50) return { error: "Điểm cộng là số nguyên từ 0 đến 50." };
  await prisma.classroom.update({ where: { id: classId }, data: { commendPoints: n } });
  await audit(user, "class.commend.points", {
    classId,
    entity: "Classroom",
    entityId: classId,
    summary: `Lớp ${classroom.name}: điểm cộng khi được tuyên dương tuần ${classroom.commendPoints} → ${n}`,
  });
  revalidatePath(`/gv/lop/${classId}`, "layout");
  revalidatePath("/hs", "layout");
  return { ok: n ? `Đã lưu: bạn được tuyên dương tuần được cộng ${n} điểm vào thi đua tổ và vườn cây.` : "Đã lưu: không cộng điểm khi được tuyên dương." };
}
