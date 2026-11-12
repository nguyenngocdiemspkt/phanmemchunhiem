"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireClassAccess, requireStudent } from "./auth";
import { audit } from "./audit";
import { fmtDate, fromDateInput } from "./format";

export type DeedState = { error?: string; ok?: string } | null;

const MAX_POINTS = 100;
const MAX_CHALLENGE_DAYS = 120;

function revalidateDeeds(classId: string) {
  revalidatePath("/hs", "layout");
  revalidatePath(`/gv/lop/${classId}`, "layout");
}

/**
 * Học sinh tạo phiếu việc tốt:
 * - Một lần (áp dụng ngay): chờ GVCN duyệt luôn
 * - Thử thách có thời hạn: đang thực hiện, em báo hoàn thành (hoặc GV duyệt khi thấy đạt)
 * Có thể có bạn được hỗ trợ trong lớp (vd: kèm bạn học tốt).
 */
export async function createDeedAction(_prev: DeedState, formData: FormData): Promise<DeedState> {
  const { user, student } = await requireStudent();
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  const kind = formData.get("kind") === "CHALLENGE" ? "CHALLENGE" : "ONCE";
  if (!title) return { error: "Em hãy ghi tên việc tốt." };

  let deadline: Date | null = null;
  if (kind === "CHALLENGE") {
    deadline = fromDateInput(String(formData.get("deadline") ?? ""));
    if (!deadline) return { error: "Thử thách cần có hạn hoàn thành." };
    const days = (deadline.getTime() - Date.now()) / 86400000;
    if (days < 0) return { error: "Hạn hoàn thành phải từ hôm nay trở đi." };
    if (days > MAX_CHALLENGE_DAYS) return { error: `Thử thách tối đa ${MAX_CHALLENGE_DAYS} ngày.` };
  }

  const beneficiaryId = String(formData.get("beneficiaryId") ?? "") || null;
  let beneficiaryName: string | null = null;
  if (beneficiaryId) {
    const b = await prisma.student.findFirst({
      where: { id: beneficiaryId, classId: student.classId, status: "ACTIVE", NOT: { id: student.id } },
      select: { user: { select: { fullName: true } } },
    });
    if (!b) return { error: "Bạn được hỗ trợ phải là bạn cùng lớp." };
    beneficiaryName = b.user.fullName;
  }

  const deed = await prisma.goodDeed.create({
    data: {
      classId: student.classId,
      authorId: student.id,
      beneficiaryId,
      title,
      description,
      kind,
      deadline,
      status: kind === "ONCE" ? "PENDING" : "ONGOING",
    },
  });
  await audit(user, "deed.create", {
    entity: "GoodDeed",
    entityId: deed.id,
    classId: student.classId,
    summary: `${user.fullName} tạo phiếu việc tốt "${title}"${beneficiaryName ? `, hỗ trợ ${beneficiaryName}` : ""}${deadline ? `, hạn ${fmtDate(deadline)}` : ""}`,
  });
  revalidateDeeds(student.classId);
  return { ok: kind === "ONCE" ? "Đã gửi phiếu, chờ thầy/cô xác nhận." : "Đã tạo thử thách. Khi hoàn thành em bấm 'Báo hoàn thành' nhé!" };
}

/** Học sinh báo đã hoàn thành thử thách: chuyển sang chờ duyệt */
export async function completeDeedAction(deedId: string) {
  const { student } = await requireStudent();
  const { count } = await prisma.goodDeed.updateMany({
    where: { id: deedId, authorId: student.id, status: "ONGOING" },
    data: { status: "PENDING", completedAt: new Date() },
  });
  if (count) revalidateDeeds(student.classId);
}

/** Học sinh rút phiếu chưa được duyệt */
export async function cancelDeedAction(deedId: string) {
  const { student } = await requireStudent();
  await prisma.goodDeed.deleteMany({ where: { id: deedId, authorId: student.id, status: { in: ["ONGOING", "PENDING"] } } });
  revalidateDeeds(student.classId);
}

/**
 * GVCN duyệt (cho điểm ngay, tùy từng trường hợp) hoặc không duyệt.
 * Điểm cộng cho người làm việc tốt và người được hỗ trợ (nếu có); tính vào vườn lớp và thi đua tổ của tuần duyệt.
 */
export async function reviewDeedAction(deedId: string, _prev: DeedState, formData: FormData): Promise<DeedState> {
  const deed = await prisma.goodDeed.findUnique({
    where: { id: deedId },
    include: { author: { include: { user: { select: { fullName: true } } } }, beneficiary: { include: { user: { select: { fullName: true } } } } },
  });
  if (!deed) return { error: "Không tìm thấy phiếu." };
  const { user } = await requireClassAccess(deed.classId);
  if (deed.status === "APPROVED" || deed.status === "REJECTED") return { error: "Phiếu đã được xử lý." };
  const note = String(formData.get("teacherNote") ?? "").trim().slice(0, 1000) || null;

  if (formData.get("intent") === "reject") {
    await prisma.goodDeed.update({ where: { id: deedId }, data: { status: "REJECTED", teacherNote: note, reviewerId: user.id, reviewedAt: new Date() } });
    await audit(user, "deed.reject", { entity: "GoodDeed", entityId: deedId, classId: deed.classId, summary: `Không duyệt việc tốt "${deed.title}" của ${deed.author.user.fullName}` });
    revalidateDeeds(deed.classId);
    return { ok: "Đã đánh dấu không duyệt." };
  }

  const parse = (k: string) => {
    const raw = String(formData.get(k) ?? "").trim();
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n <= MAX_POINTS ? n : NaN;
  };
  const authorPoints = parse("authorPoints");
  const beneficiaryPoints = deed.beneficiaryId ? parse("beneficiaryPoints") : 0;
  if (isNaN(authorPoints) || isNaN(beneficiaryPoints)) return { error: `Điểm là số nguyên từ 0 đến ${MAX_POINTS}.` };
  if (authorPoints === 0 && beneficiaryPoints === 0) return { error: "Hãy nhập điểm cho việc tốt này." };

  await prisma.goodDeed.update({
    where: { id: deedId },
    data: {
      status: "APPROVED",
      authorPoints,
      beneficiaryPoints: deed.beneficiaryId ? beneficiaryPoints : null,
      teacherNote: note,
      reviewerId: user.id,
      reviewedAt: new Date(),
    },
  });
  await audit(user, "deed.approve", {
    entity: "GoodDeed",
    entityId: deedId,
    classId: deed.classId,
    summary: `Duyệt việc tốt "${deed.title}": ${deed.author.user.fullName} +${authorPoints}${deed.beneficiary ? `, ${deed.beneficiary.user.fullName} +${beneficiaryPoints}` : ""}`,
  });
  revalidateDeeds(deed.classId);
  return { ok: "Đã duyệt và cộng điểm." };
}
