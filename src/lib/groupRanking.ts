import type { GroupCriterionKind } from "@prisma/client";
import { prisma } from "./db";
import { weekStart } from "./format";
export { GROUP_KIND } from "./scoring";

export const DEFAULT_GROUP_CRITERIA: { name: string; kind: GroupCriterionKind; stars: number; active: boolean }[] = [
  { name: "Cả tổ không ai vi phạm trong tuần", kind: "NO_VIOLATION", stars: 1, active: true },
  { name: "Tất cả thành viên có phiếu tuần được duyệt", kind: "ALL_SUBMITTED", stars: 1, active: false },
  { name: "Cả tổ xếp loại Tốt", kind: "ALL_GOOD", stars: 1, active: false },
  { name: "Trực nhật, giữ vệ sinh lớp tốt", kind: "MANUAL", stars: 1, active: false },
];

/** Tiêu chí xếp hạng tổ của lớp; lớp chưa có thì tạo bộ mặc định */
export async function ensureGroupCriteria(classId: string) {
  const count = await prisma.groupCriterion.count({ where: { classId } });
  if (count === 0) {
    await prisma.groupCriterion.createMany({ data: DEFAULT_GROUP_CRITERIA.map((c, i) => ({ ...c, classId, sortOrder: i })) });
  }
  return prisma.groupCriterion.findMany({ where: { classId }, orderBy: { sortOrder: "asc" } });
}

export type StarHit = { name: string; stars: number };
/** Sao của từng tổ trong từng tuần: weekKey (ms của 0h thứ Hai) -> groupNo -> các tiêu chí đạt */
export type WeekStars = Map<number, Map<number, StarHit[]>>;

/** Một phiếu tuần đã duyệt, đã tính sẵn: có vi phạm (tiêu chí trừ điểm với số lần > 0) hay không */
export type ApprovedSheet = { studentId: string; groupNo: number | null; week: number; points: number; violation: boolean };

/**
 * Tính sao của các tổ theo tuần.
 * - scoringWeeks: các tuần lớp có đợt chấm điểm theo tiêu chí (chỉ những tuần này mới xét tiêu chí tự động)
 * - members: thành viên đang học của từng tổ (tổ hiện tại)
 * - penalties: các tuần tổ bị GV/cán sự ghi điểm trừ trực tiếp
 */
export function computeGroupStars(input: {
  criteria: { id: string; name: string; kind: GroupCriterionKind; stars: number; active: boolean }[];
  scoringWeeks: Set<number>;
  members: Map<number, string[]>;
  sheets: ApprovedSheet[];
  penalties: { groupNo: number; week: number }[];
  awards: { groupNo: number; week: number; name: string; stars: number }[];
  ratingGood: number;
}): WeekStars {
  const result: WeekStars = new Map();
  const add = (week: number, groupNo: number, hit: StarHit) => {
    if (!result.has(week)) result.set(week, new Map());
    const byGroup = result.get(week)!;
    byGroup.set(groupNo, [...(byGroup.get(groupNo) ?? []), hit]);
  };
  const auto = input.criteria.filter((c) => c.active && c.kind !== "MANUAL");

  for (const week of input.scoringWeeks) {
    for (const [groupNo, ids] of input.members) {
      if (ids.length === 0) continue;
      const groupSheets = input.sheets.filter((s) => s.week === week && s.groupNo === groupNo);
      const sheetsOf = (id: string) => groupSheets.filter((s) => s.studentId === id);
      for (const c of auto) {
        let met = false;
        if (c.kind === "NO_VIOLATION") {
          met =
            groupSheets.length > 0 &&
            !groupSheets.some((s) => s.violation) &&
            !input.penalties.some((p) => p.week === week && p.groupNo === groupNo);
        } else if (c.kind === "ALL_SUBMITTED") {
          met = ids.every((id) => sheetsOf(id).length > 0);
        } else if (c.kind === "ALL_GOOD") {
          met = ids.every((id) => sheetsOf(id).length > 0 && sheetsOf(id).every((s) => s.points >= input.ratingGood));
        }
        if (met) add(week, groupNo, { name: c.name, stars: c.stars });
      }
    }
  }
  // Tiêu chí chấm tay: số sao đã chụp lại lúc GV tick
  for (const a of input.awards) add(a.week, a.groupNo, { name: a.name, stars: a.stars });
  return result;
}

export function weekKey(d: Date) {
  return weekStart(d).getTime();
}
