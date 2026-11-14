import { prisma } from "./db";
import { fmtDateTime } from "./format";
import { sendPushToUser } from "./push";

/**
 * Nhắc học sinh làm phiếu tự đánh giá bằng thông báo đẩy:
 * - mốc "24h": hạn nộp còn ≤ 24 giờ; mốc "3h": còn ≤ 3 giờ (mỗi mốc nhắc 1 lần)
 * - chỉ nhắc em chưa nộp, hoặc phiếu đang được thầy/cô nhờ sửa
 * - không nhắc trong giờ nghỉ 22h–6h (giờ VN); mốc rơi vào giờ nghỉ thì nhắc lúc 6h nếu còn hạn
 */
const HOUR = 60 * 60 * 1000;
const MARKS = [
  { kind: "3h", within: 3 * HOUR },
  { kind: "24h", within: 24 * HOUR },
] as const;

export function isQuietHour(now: Date) {
  const h = new Date(now.getTime() + 7 * HOUR).getUTCHours();
  return h >= 22 || h < 6;
}

function hoursLeft(ms: number) {
  if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60000))} phút`;
  return `${Math.round(ms / HOUR)} giờ`;
}

export async function runReminders(now = new Date()) {
  const result = { checked: 0, sent: 0, devices: 0, quiet: isQuietHour(now) };
  if (result.quiet) return result;
  const surveys = await prisma.survey.findMany({
    where: { openAt: { lte: now }, closeAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR) } },
    select: { id: true, title: true, classId: true, closeAt: true },
  });
  for (const sv of surveys) {
    const left = sv.closeAt.getTime() - now.getTime();
    const mark = MARKS.find((m) => left <= m.within)!;
    const students = await prisma.student.findMany({
      where: { classId: sv.classId, status: "ACTIVE", user: { active: true } },
      select: { id: true, userId: true, responses: { where: { surveyId: sv.id }, select: { status: true } } },
    });
    const logs = await prisma.reminderLog.findMany({ where: { surveyId: sv.id }, select: { studentId: true, kind: true } });
    // Chỉ xét em đã bật nhắc nhở trên ít nhất một thiết bị (em bật muộn vẫn được nhắc ở mốc còn lại)
    const subscribed = new Set(
      (await prisma.pushSubscription.findMany({ where: { userId: { in: students.map((s) => s.userId) } }, select: { userId: true } })).map((x) => x.userId),
    );
    const done = new Set(logs.map((l) => `${l.studentId}:${l.kind}`));
    for (const st of students) {
      const status = st.responses[0]?.status;
      if (status && status !== "REVISION") continue; // đã nộp
      if (!subscribed.has(st.userId)) continue;
      result.checked++;
      if (done.has(`${st.id}:${mark.kind}`)) continue;
      const revision = status === "REVISION";
      const delivered = await sendPushToUser(st.userId, {
        title: revision ? "Thầy/cô nhờ em sửa phiếu tự đánh giá" : "Nhắc làm phiếu tự đánh giá",
        body: `${revision ? "Em sửa và gửi lại" : "Em chưa làm"} phiếu “${sv.title}”. Còn khoảng ${hoursLeft(left)} nữa là hết hạn (${fmtDateTime(sv.closeAt)}).`,
        url: `/hs/phieu/${sv.id}`,
        tag: `phieu-${sv.id}`,
      });
      // Ghi lại cả mốc 24h khi đã nhắc mốc 3h (không nhắc mốc 24h muộn nữa)
      const kinds = mark.kind === "3h" ? ["3h", "24h"] : ["24h"];
      for (const kind of kinds) {
        await prisma.reminderLog
          .create({ data: { surveyId: sv.id, studentId: st.id, kind, delivered: kind === mark.kind ? delivered : 0 } })
          .catch(() => {}); // đã có (chạy song song) thì bỏ qua
      }
      result.sent++;
      result.devices += delivered;
    }
  }
  return result;
}
