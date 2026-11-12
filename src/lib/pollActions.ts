"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireClassAccess, requireStudent } from "./auth";
import { audit } from "./audit";
import { fmtDateTime, fromLocalInput } from "./format";
import { MAX_OPTIONS, MIN_OPTIONS, pollStatus } from "./polls";

export type PollState = { error?: string; ok?: string } | null;

function revalidatePolls(classId: string) {
  revalidatePath(`/gv/lop/${classId}/binh-chon`, "layout");
  revalidatePath("/hs/binh-chon");
}

/** GVCN tạo cuộc bình chọn cho lớp */
export async function createPollAction(classId: string, _prev: PollState, formData: FormData): Promise<PollState> {
  const { user, classroom } = await requireClassAccess(classId);
  const question = String(formData.get("question") ?? "").trim().slice(0, 300);
  const description = String(formData.get("description") ?? "").trim().slice(0, 2000) || null;
  const options = formData
    .getAll("option")
    .map((o) => String(o).trim().slice(0, 200))
    .filter(Boolean);
  const startAt = fromLocalInput(String(formData.get("startAt") ?? ""));
  const endAt = fromLocalInput(String(formData.get("endAt") ?? ""));
  if (!question) return { error: "Vui lòng nhập nội dung bình chọn." };
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) return { error: `Cần từ ${MIN_OPTIONS} đến ${MAX_OPTIONS} lựa chọn.` };
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return { error: "Các lựa chọn không được trùng nhau." };
  if (!startAt || !endAt) return { error: "Vui lòng nhập thời gian bắt đầu và kết thúc." };
  if (endAt <= startAt) return { error: "Thời gian kết thúc phải sau thời gian bắt đầu." };
  if (endAt <= new Date()) return { error: "Thời gian kết thúc phải ở tương lai." };

  const poll = await prisma.poll.create({
    data: {
      classId,
      authorId: user.id,
      question,
      description,
      startAt,
      endAt,
      options: { create: options.map((text, i) => ({ text, sortOrder: i })) },
    },
  });
  await audit(user, "class.poll.create", {
    classId,
    entity: "Poll",
    entityId: poll.id,
    summary: `Lớp ${classroom.name}: tạo bình chọn "${question}" (${options.length} lựa chọn, ${fmtDateTime(startAt)} → ${fmtDateTime(endAt)})`,
  });
  revalidatePolls(classId);
  return { ok: "Đã tạo bình chọn." };
}

async function requirePoll(pollId: string) {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) return null;
  const { user, classroom } = await requireClassAccess(poll.classId);
  return { poll, user, classroom };
}

/** GVCN đóng bình chọn ngay, không đợi tới giờ kết thúc */
export async function closePollAction(pollId: string) {
  const found = await requirePoll(pollId);
  if (!found || found.poll.closedAt) return;
  await prisma.poll.update({ where: { id: pollId }, data: { closedAt: new Date() } });
  await audit(found.user, "class.poll.close", {
    classId: found.poll.classId,
    entity: "Poll",
    entityId: pollId,
    summary: `Lớp ${found.classroom.name}: đóng sớm bình chọn "${found.poll.question}"`,
  });
  revalidatePolls(found.poll.classId);
}

export async function deletePollAction(pollId: string) {
  const found = await requirePoll(pollId);
  if (!found) return;
  const votes = await prisma.pollVote.count({ where: { pollId } });
  await prisma.poll.delete({ where: { id: pollId } });
  await audit(found.user, "class.poll.delete", {
    classId: found.poll.classId,
    entity: "Poll",
    entityId: pollId,
    summary: `Lớp ${found.classroom.name}: xóa bình chọn "${found.poll.question}" (${votes} lượt bình chọn)`,
  });
  revalidatePolls(found.poll.classId);
}

/** Học sinh bình chọn (đổi được lựa chọn khi bình chọn còn mở) */
export async function voteAction(pollId: string, _prev: PollState, formData: FormData): Promise<PollState> {
  const { student } = await requireStudent();
  const poll = await prisma.poll.findUnique({ where: { id: pollId }, include: { options: { select: { id: true } } } });
  if (!poll || poll.classId !== student.classId) return { error: "Không tìm thấy bình chọn." };
  const status = pollStatus(poll);
  if (status === "upcoming") return { error: "Bình chọn chưa mở." };
  if (status === "closed") return { error: "Bình chọn đã đóng." };
  const optionId = String(formData.get("optionId") ?? "");
  if (!poll.options.some((o) => o.id === optionId)) return { error: "Em hãy chọn một phương án." };
  await prisma.pollVote.upsert({
    where: { pollId_studentId: { pollId, studentId: student.id } },
    create: { pollId, optionId, studentId: student.id },
    update: { optionId },
  });
  revalidatePolls(poll.classId);
  return { ok: "Em đã bình chọn." };
}
