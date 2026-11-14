import { prisma } from "./db";
import { addDays, fmtShortDate, weekStart } from "./format";

/**
 * Bình chọn tuyên dương:
 * - Tuần: mỗi học sinh bầu 1 bạn; bạn nhiều phiếu nhất được tuyên dương (bằng phiếu thì cùng được tuyên dương).
 *   Kết quả tuần chỉ chốt khi tuần đã kết thúc.
 * - Tháng / học kỳ: tính từ số lần được tuyên dương tuần (các tuần đã kết thúc); bằng nhau thì xét tổng số phiếu.
 * Tuần thuộc tháng/học kỳ theo ngày thứ Hai của tuần.
 */

const VN_OFFSET = 7 * 60 * 60 * 1000;

export type Tally = { studentId: string; name: string; votes: number };
export type WeekResult = {
  start: Date;
  label: string;
  /** Tuần đã kết thúc (kết quả đã chốt) */
  done: boolean;
  voters: number;
  tally: Tally[];
  winners: Tally[];
};
export type Standing = { studentId: string; name: string; wins: number; votes: number };
export type PeriodResult = {
  key: string;
  label: string;
  /** Kỳ đã kết thúc: kết quả chốt; chưa thì là tạm tính */
  done: boolean;
  weeksCounted: number;
  standings: Standing[];
  winners: Standing[];
};

export function weekLabel(start: Date) {
  return `${fmtShortDate(start)} – ${fmtShortDate(addDays(start, 6))}`;
}

function localYm(d: Date) {
  const l = new Date(d.getTime() + VN_OFFSET);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth() };
}

/** Thứ Hai cuối cùng (0h giờ VN) có ngày thuộc tháng y/m */
function lastMondayOfMonth(y: number, m: number) {
  const firstNext = new Date(Date.UTC(y, m + 1, 1) - VN_OFFSET); // 0h ngày 1 tháng sau (giờ VN)
  return weekStart(addDays(firstNext, -1));
}

function aggregate(weeks: WeekResult[]): { standings: Standing[]; winners: Standing[] } {
  const map = new Map<string, Standing>();
  for (const w of weeks) {
    for (const t of w.tally) {
      const s = map.get(t.studentId) ?? { studentId: t.studentId, name: t.name, wins: 0, votes: 0 };
      s.votes += t.votes;
      map.set(t.studentId, s);
    }
    for (const win of w.winners) map.get(win.studentId)!.wins++;
  }
  const standings = [...map.values()].filter((s) => s.wins > 0).sort((a, b) => b.wins - a.wins || b.votes - a.votes || a.name.localeCompare(b.name, "vi"));
  const top = standings[0];
  const winners = top ? standings.filter((s) => s.wins === top.wins && s.votes === top.votes) : [];
  return { standings, winners };
}

/** Kết quả bình chọn tuyên dương của một lớp */
export async function loadCommendations(
  classId: string,
  year: { name: string; startDate: Date; semester2Start: Date; endDate: Date } | null,
  now = new Date(),
) {
  const votes = await prisma.commendationVote.findMany({
    where: { classId },
    select: { weekStart: true, voterId: true, nomineeId: true, nominee: { select: { user: { select: { fullName: true } } } } },
  });
  const current = weekStart(now).getTime();

  // Từng tuần
  const byWeek = new Map<number, typeof votes>();
  for (const v of votes) {
    const k = v.weekStart.getTime();
    byWeek.set(k, [...(byWeek.get(k) ?? []), v]);
  }
  const weeks: WeekResult[] = [...byWeek.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([k, list]) => {
      const tallyMap = new Map<string, Tally>();
      for (const v of list) {
        const t = tallyMap.get(v.nomineeId) ?? { studentId: v.nomineeId, name: v.nominee.user.fullName, votes: 0 };
        t.votes++;
        tallyMap.set(v.nomineeId, t);
      }
      const tally = [...tallyMap.values()].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "vi"));
      const max = tally[0]?.votes ?? 0;
      const start = new Date(k);
      return { start, label: weekLabel(start), done: k < current, voters: list.length, tally, winners: max > 0 ? tally.filter((t) => t.votes === max) : [] };
    });
  const doneWeeks = weeks.filter((w) => w.done);

  // Từng tháng (tháng có tuần bình chọn + tháng hiện tại)
  const monthKeys = new Map<string, { y: number; m: number }>();
  for (const w of weeks) {
    const ym = localYm(w.start);
    monthKeys.set(`${ym.y}-${ym.m}`, ym);
  }
  const nowYm = localYm(new Date(current));
  monthKeys.set(`${nowYm.y}-${nowYm.m}`, nowYm);
  const months: PeriodResult[] = [...monthKeys.values()]
    .sort((a, b) => b.y - a.y || b.m - a.m)
    .map(({ y, m }) => {
      const inMonth = doneWeeks.filter((w) => {
        const ym = localYm(w.start);
        return ym.y === y && ym.m === m;
      });
      return {
        key: `${y}-${String(m + 1).padStart(2, "0")}`,
        label: `Tháng ${m + 1}/${y}`,
        done: current > lastMondayOfMonth(y, m).getTime(),
        weeksCounted: inMonth.length,
        ...aggregate(inMonth),
      };
    });

  // Học kỳ của năm học
  const semesters: PeriodResult[] = [];
  if (year) {
    const s1 = weekStart(year.startDate).getTime();
    const s2 = weekStart(year.semester2Start).getTime();
    const end = addDays(year.endDate, 1).getTime();
    for (const [key, label, from, to] of [
      ["HK2", `Học kỳ II, ${year.name}`, s2, end],
      ["HK1", `Học kỳ I, ${year.name}`, s1, s2],
    ] as const) {
      if (now.getTime() < from) continue;
      const inSem = doneWeeks.filter((w) => w.start.getTime() >= from && w.start.getTime() < to);
      semesters.push({ key, label, done: now.getTime() >= to, weeksCounted: inSem.length, ...aggregate(inSem) });
    }
  }

  return { currentWeek: new Date(current), weeks, months, semesters };
}

export type CommendationData = Awaited<ReturnType<typeof loadCommendations>>;
