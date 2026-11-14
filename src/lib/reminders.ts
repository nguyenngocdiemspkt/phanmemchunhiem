import { prisma } from "./db";
import { addDays, fmtDateTime, weekStart } from "./format";
import { loadCommendations } from "./commendation";
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

/**
 * Chúc mừng bạn được bình chọn tuyên dương (thông báo đẩy), mỗi lần một thông báo:
 * - tuần vừa kết thúc; - tháng / học kỳ vừa được chốt (trong 7 ngày sau khi chốt).
 * Không gửi trong giờ nghỉ 22h–6h.
 */
export async function runCommendNotices(now = new Date()) {
  const result = { sent: 0, devices: 0 };
  if (isQuietHour(now)) return result;
  const thisWeek = weekStart(now);
  const lastWeek = addDays(thisWeek, -7).getTime();
  const recent = await prisma.commendationVote.findMany({
    where: { weekStart: { gte: addDays(thisWeek, -7 * 26) } },
    distinct: ["classId"],
    select: { classId: true },
  });
  for (const { classId } of recent) {
    const classroom = await prisma.classroom.findUnique({ where: { id: classId }, select: { name: true, schoolYear: true } });
    if (!classroom) continue;
    const year = await prisma.schoolYear.findUnique({ where: { name: classroom.schoolYear } });
    const data = await loadCommendations(classId, year, now);
    const notices: { key: string; ids: string[]; title: string; body: string }[] = [];
    const w = data.weeks.find((x) => x.done && x.start.getTime() === lastWeek && x.winners.length);
    if (w) {
      notices.push({
        key: `td:${classId}:tuan:${w.start.getTime()}`,
        ids: w.winners.map((x) => x.studentId),
        title: "🎉 Chúc mừng em được tuyên dương tuần!",
        body: `Các bạn lớp ${classroom.name} đã bình chọn tuyên dương em tuần ${w.label}. Vào xem lời khen của các bạn nhé!`,
      });
    }
    for (const [kind, list] of [["thang", data.months], ["hocky", data.semesters]] as const) {
      for (const p of list) {
        if (!p.done || !p.winners.length || now.getTime() - p.endsAt.getTime() > 7 * 24 * HOUR) continue;
        notices.push({
          key: `td:${classId}:${kind}:${p.key}`,
          ids: p.winners.map((x) => x.studentId),
          title: `🏆 Chúc mừng em được tuyên dương ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)}!`,
          body: `Em là bạn được tuyên dương nhiều nhất ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)} của lớp ${classroom.name}. Thầy/cô có giấy khen dành cho em.`,
        });
      }
    }
    for (const n of notices) {
      const students = await prisma.student.findMany({ where: { id: { in: n.ids } }, select: { id: true, userId: true } });
      for (const st of students) {
        if (!(await prisma.pushSubscription.count({ where: { userId: st.userId } }))) continue;
        // Ghi trước để chỉ gửi một lần (mã kỳ lưu ở cột surveyId của nhật ký nhắc nhở)
        const created = await prisma.reminderLog.create({ data: { surveyId: n.key, studentId: st.id, kind: "tuyen-duong" } }).catch(() => null);
        if (!created) continue;
        const delivered = await sendPushToUser(st.userId, { title: n.title, body: n.body, url: "/hs/binh-chon", tag: n.key.slice(-30) });
        await prisma.reminderLog.update({ where: { id: created.id }, data: { delivered } });
        result.sent++;
        result.devices += delivered;
      }
    }
  }
  return result;
}
