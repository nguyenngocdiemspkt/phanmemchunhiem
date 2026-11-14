import { notFound } from "next/navigation";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { addDays, fmtShortDate, toDateInput, weekStart } from "./format";
import { effectiveCounts, groupName, parseCounts, parseCriteria } from "./scoring";
import { computeGroupStars, ensureGroupCriteria, weekKey, type StarHit } from "./groupRanking";
import { commendWinners } from "./commendation";

export const MAX_GROUPS = 12;

/** Danh mục gợi ý khi lớp mở thi đua lần đầu; giáo viên sửa lại tùy ý. */
export const DEFAULT_CATEGORIES = [
  { name: "Phát biểu xây dựng bài", points: 1 },
  { name: "Điểm 9–10", points: 2 },
  { name: "Việc tốt, giúp đỡ bạn", points: 3 },
  { name: "Tham gia phong trào của trường", points: 5 },
  { name: "Đi học trễ", points: -2 },
  { name: "Không thuộc bài / không làm bài tập", points: -2 },
  { name: "Mất trật tự trong giờ học", points: -2 },
  { name: "Không đúng đồng phục", points: -1 },
  { name: "Không trực nhật", points: -3 },
  { name: "Vắng không phép", points: -5 },
];

/** Màu cho từng tổ trên biểu đồ */
export const GROUP_COLORS = ["#0f766e", "#2563eb", "#d97706", "#db2777", "#7c3aed", "#16a34a", "#dc2626", "#0891b2", "#65a30d", "#9333ea", "#ea580c", "#475569"];

/**
 * teacher: GVCN hoặc quản trị, toàn quyền.
 * monitor: cán sự lớp, ghi và xóa điểm của chính mình trong tuần hiện tại.
 * viewer: học sinh khác trong lớp, chỉ xem.
 */
export type EmulationLevel = "teacher" | "monitor" | "viewer";

export async function requireEmulationAccess(classId: string) {
  const user = await requireUser();
  const classroom = await prisma.classroom.findUnique({ where: { id: classId } });
  if (!classroom) notFound();
  if (user.role === "ADMIN" || (user.role === "TEACHER" && classroom.homeroomTeacherId === user.id)) {
    return { user, classroom, level: "teacher" as EmulationLevel };
  }
  if (user.role === "STUDENT" && user.student?.classId === classId) {
    return { user, classroom, level: (user.student.isMonitor ? "monitor" : "viewer") as EmulationLevel };
  }
  notFound();
}

/** Cán sự chỉ được ghi/xóa điểm trong tuần hiện tại và không ghi trước ngày. */
export function monitorCanEdit(date: Date, now = new Date()) {
  return date >= weekStart(now) && toDateInput(date) <= toDateInput(now);
}

export async function ensureCategories(classId: string) {
  const count = await prisma.emulationCategory.count({ where: { classId } });
  if (count === 0) {
    await prisma.emulationCategory.createMany({
      data: DEFAULT_CATEGORIES.map((c, i) => ({ ...c, classId, sortOrder: i })),
    });
  }
  return prisma.emulationCategory.findMany({ where: { classId }, orderBy: { sortOrder: "asc" } });
}

/**
 * sheets: điểm TRUNG BÌNH các phiếu tuần đã duyệt của thành viên (để tổ đông hay ít người đều công bằng);
 * ở bảng cả năm là tổng các điểm trung bình từng tuần. plus/minus: điểm ghi trực tiếp;
 * stars: số sao từ tiêu chí xếp hạng tổ, quy ra starScore = stars × số điểm mỗi sao.
 */
export type GroupStanding = {
  groupNo: number;
  name: string;
  members: number;
  sheets: number;
  sheetCount: number;
  /** Điểm việc tốt đã duyệt của thành viên (người làm + người được hỗ trợ) */
  deeds: number;
  plus: number;
  minus: number;
  stars: number;
  starScore: number;
  /** Tiêu chí tổ đạt (chỉ có ở bảng tuần) */
  hits: StarHit[];
  total: number;
  rank: number;
};

type SheetPoints = { groupNo: number | null; points: number; date: Date; /** số phiếu gộp trong điểm trung bình */ count?: number };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Gộp phiếu đã duyệt theo tổ và tuần: mỗi tổ mỗi tuần một điểm = trung bình điểm các phiếu của tuần đó */
function weeklyAverages(sheets: SheetPoints[]): SheetPoints[] {
  const buckets = new Map<string, { groupNo: number; week: number; sum: number; count: number }>();
  for (const sh of sheets) {
    if (!sh.groupNo) continue;
    const week = weekKey(sh.date);
    const key = `${sh.groupNo}:${week}`;
    const b = buckets.get(key) ?? { groupNo: sh.groupNo, week, sum: 0, count: 0 };
    b.sum += sh.points;
    b.count++;
    buckets.set(key, b);
  }
  return [...buckets.values()].map((b) => ({ groupNo: b.groupNo, points: round1(b.sum / b.count), date: new Date(b.week), count: b.count }));
}

function rankGroups(
  groupCount: number,
  groupNames: unknown,
  records: { groupNo: number; points: number }[],
  sheets: SheetPoints[],
  deeds: SheetPoints[],
  members: Map<number, number>,
  stars: { byGroup: Map<number, StarHit[]>; starPoints: number; showHits: boolean },
): GroupStanding[] {
  const rows: GroupStanding[] = Array.from({ length: groupCount }, (_, i) => ({
    groupNo: i + 1,
    name: groupName(groupNames, i + 1),
    members: members.get(i + 1) ?? 0,
    sheets: 0,
    sheetCount: 0,
    deeds: 0,
    plus: 0,
    minus: 0,
    stars: 0,
    starScore: 0,
    hits: [],
    total: 0,
    rank: 0,
  }));
  for (const sh of sheets) {
    const row = sh.groupNo ? rows[sh.groupNo - 1] : undefined;
    if (!row) continue;
    row.sheets += sh.points;
    row.sheetCount += sh.count ?? 1;
    row.total += sh.points;
  }
  for (const d of deeds) {
    const row = d.groupNo ? rows[d.groupNo - 1] : undefined;
    if (!row) continue;
    row.deeds += d.points;
    row.total += d.points;
  }
  for (const r of records) {
    const row = rows[r.groupNo - 1];
    if (!row) continue;
    if (r.points > 0) row.plus += r.points;
    else row.minus += r.points;
    row.total += r.points;
  }
  for (const [groupNo, hits] of stars.byGroup) {
    const row = rows[groupNo - 1];
    if (!row) continue;
    row.stars += hits.reduce((s, h) => s + h.stars, 0);
    if (stars.showHits) row.hits.push(...hits);
  }
  for (const row of rows) {
    row.starScore = row.stars * stars.starPoints;
    row.total = round1(row.total + row.starScore);
    row.sheets = round1(row.sheets);
  }
  // Bằng điểm thì đồng hạng
  for (const row of rows) row.rank = 1 + rows.filter((o) => o.total > row.total).length;
  return rows.sort((a, b) => a.rank - b.rank || a.groupNo - b.groupNo);
}

const CHART_WEEKS = 8;

/** Toàn bộ dữ liệu cho bảng thi đua của một lớp trong một tuần. */
export async function loadEmulationBoard(
  classroom: { id: string; groupCount: number; groupNames: unknown; ratingGood: number; starPoints: number; commendPoints: number },
  week: { start: Date; end: Date },
) {
  const { id: classId, groupCount, groupNames } = classroom;
  const chartFrom = addDays(week.start, -7 * (CHART_WEEKS - 1));
  const [allRecords, weekRecords, students, categories, approved, acceptedReports, scoringSurveys, groupCriteria, awards, approvedDeeds] = await Promise.all([
    prisma.emulationRecord.findMany({ where: { classId }, select: { groupNo: true, points: true, date: true } }),
    prisma.emulationRecord.findMany({
      where: { classId, date: { gte: week.start, lt: week.end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        student: { select: { user: { select: { fullName: true } } } },
        author: { select: { fullName: true } },
      },
    }),
    prisma.student.findMany({
      where: { classId, user: { active: true } },
      select: { id: true, groupNo: true, isMonitor: true, status: true, user: { select: { fullName: true } } },
    }),
    ensureCategories(classId),
    // Phiếu tuần đã duyệt có điểm thi đua; tính vào tổ hiện tại của học sinh, theo tuần mở đợt
    prisma.response.findMany({
      where: { status: "APPROVED", points: { not: null }, survey: { classId } },
      select: {
        surveyId: true,
        studentId: true,
        points: true,
        selfCounts: true,
        teacherCounts: true,
        student: { select: { groupNo: true, classId: true } },
        survey: { select: { openAt: true, criteria: true } },
      },
    }),
    prisma.scoreReport.findMany({
      where: { status: "ACCEPTED", criterionId: { not: null }, survey: { classId } },
      select: { surveyId: true, studentId: true, criterionId: true, times: true },
    }),
    prisma.survey.findMany({ where: { classId, baseScore: { not: null } }, select: { openAt: true, criteria: true } }),
    ensureGroupCriteria(classId),
    prisma.groupAward.findMany({ where: { classId }, select: { criterionId: true, groupNo: true, weekStart: true, name: true, stars: true } }),
    prisma.goodDeed.findMany({
      where: { classId, status: "APPROVED", reviewedAt: { not: null } },
      select: {
        reviewedAt: true,
        authorPoints: true,
        beneficiaryPoints: true,
        author: { select: { groupNo: true, classId: true } },
        beneficiary: { select: { groupNo: true, classId: true } },
      },
    }),
  ]);
  // Việc tốt: điểm vào tổ hiện tại của người làm và người được hỗ trợ, theo tuần GV duyệt
  const deeds: SheetPoints[] = approvedDeeds.flatMap((d) => [
    ...(d.author.classId === classId && d.authorPoints ? [{ groupNo: d.author.groupNo, points: d.authorPoints, date: d.reviewedAt! }] : []),
    ...(d.beneficiary?.classId === classId && d.beneficiaryPoints ? [{ groupNo: d.beneficiary.groupNo, points: d.beneficiaryPoints, date: d.reviewedAt! }] : []),
  ]);
  // Được bình chọn tuyên dương tuần: cộng điểm cho tổ hiện tại của bạn đó, vào tuần được tuyên dương
  if (classroom.commendPoints) {
    const groupOf = new Map(students.map((s) => [s.id, s.groupNo]));
    for (const w of await commendWinners([classId])) {
      if (groupOf.has(w.studentId)) deeds.push({ groupNo: groupOf.get(w.studentId) ?? null, points: classroom.commendPoints, date: w.weekStart });
    }
  }
  const weekDeeds = deeds.filter((x) => x.date >= week.start && x.date < week.end);
  const own = approved.filter((r) => r.student.classId === classId);
  // Điểm phiếu của tổ: trung bình các phiếu đã duyệt trong từng tuần (không cộng tổng, vì sĩ số các tổ khác nhau)
  const sheets = weeklyAverages(own.map((r) => ({ groupNo: r.student.groupNo, points: r.points!, date: r.survey.openAt })));
  const weekSheets = sheets.filter((x) => x.date >= week.start && x.date < week.end);

  const lastWord = (s: string) => s.trim().split(/\s+/).at(-1) ?? s;
  students.sort(
    (a, b) =>
      lastWord(a.user.fullName).localeCompare(lastWord(b.user.fullName), "vi") ||
      a.user.fullName.localeCompare(b.user.fullName, "vi"),
  );

  const members = new Map<number, number>();
  for (const s of students) if (s.groupNo) members.set(s.groupNo, (members.get(s.groupNo) ?? 0) + 1);

  // Sao của các tổ theo từng tuần, từ tiêu chí xếp hạng tổ
  const memberIds = new Map<number, string[]>();
  for (let g = 1; g <= groupCount; g++) {
    memberIds.set(g, students.filter((s) => s.groupNo === g && s.status === "ACTIVE").map((s) => s.id));
  }
  const weekStars = computeGroupStars({
    criteria: groupCriteria,
    scoringWeeks: new Set(scoringSurveys.filter((s) => parseCriteria(s.criteria).length > 0).map((s) => weekKey(s.openAt))),
    members: memberIds,
    sheets: own.map((r) => {
      const criteria = parseCriteria(r.survey.criteria);
      const counts = effectiveCounts(
        criteria,
        parseCounts(r.selfCounts),
        r.teacherCounts == null ? null : parseCounts(r.teacherCounts),
        acceptedReports.filter((a) => a.surveyId === r.surveyId && a.studentId === r.studentId),
      );
      return {
        studentId: r.studentId,
        groupNo: r.student.groupNo,
        week: weekKey(r.survey.openAt),
        points: r.points!,
        violation: criteria.some((c) => c.points < 0 && (counts[c.id] ?? 0) > 0),
      };
    }),
    penalties: allRecords.filter((r) => r.points < 0).map((r) => ({ groupNo: r.groupNo, week: weekKey(r.date) })),
    awards: awards.map((a) => ({ groupNo: a.groupNo, week: a.weekStart.getTime(), name: a.name, stars: a.stars })),
    ratingGood: classroom.ratingGood,
  });
  const thisWeek = week.start.getTime();
  const allStars = new Map<number, StarHit[]>();
  for (const byGroup of weekStars.values()) {
    for (const [g, hits] of byGroup) allStars.set(g, [...(allStars.get(g) ?? []), ...hits]);
  }

  // Biểu đồ: tổng điểm từng tuần của mỗi tổ (gồm điểm sao), CHART_WEEKS tuần gần nhất tính đến tuần đang xem
  const chart = Array.from({ length: CHART_WEEKS }, (_, i) => {
    const start = addDays(chartFrom, 7 * i);
    const row: Record<string, string | number> = { label: fmtShortDate(start) };
    for (let g = 1; g <= groupCount; g++) row[`g${g}`] = 0;
    return { start, end: addDays(start, 7), row };
  });
  const starEntries = [...weekStars].flatMap(([w, byGroup]) =>
    [...byGroup].map(([g, hits]) => ({
      groupNo: g,
      date: new Date(w),
      points: hits.reduce((s, h) => s + h.stars, 0) * classroom.starPoints,
    })),
  );
  for (const r of [...allRecords, ...sheets, ...deeds, ...starEntries]) {
    if (!r.groupNo || r.groupNo > groupCount) continue;
    const bucket = chart.find((c) => r.date >= c.start && r.date < c.end);
    if (bucket) bucket.row[`g${r.groupNo}`] = round1((bucket.row[`g${r.groupNo}`] as number) + r.points);
  }

  const manualCriteria = groupCriteria.filter((c) => c.active && c.kind === "MANUAL");
  return {
    weekly: rankGroups(groupCount, groupNames, weekRecords, weekSheets, weekDeeds, members, {
      byGroup: weekStars.get(thisWeek) ?? new Map(),
      starPoints: classroom.starPoints,
      showHits: true,
    }),
    overall: rankGroups(groupCount, groupNames, allRecords, sheets, deeds, members, {
      byGroup: allStars,
      starPoints: classroom.starPoints,
      showHits: false,
    }),
    chart: chart.map((c) => c.row),
    hasChartData: [...allRecords, ...sheets, ...deeds, ...starEntries].some((r) => r.date >= chartFrom && r.date < week.end),
    groupNames: Array.from({ length: groupCount }, (_, i) => groupName(groupNames, i + 1)),
    starPoints: classroom.starPoints,
    manualCriteria: manualCriteria.map((c) => ({ id: c.id, name: c.name, stars: c.stars })),
    weekAwards: awards.filter((a) => a.weekStart.getTime() === thisWeek).map((a) => ({ criterionId: a.criterionId, groupNo: a.groupNo })),
    records: weekRecords,
    students: students.map((s) => ({ id: s.id, name: s.user.fullName, groupNo: s.groupNo, isMonitor: s.isMonitor })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, points: c.points })),
  };
}

export type EmulationBoardData = Awaited<ReturnType<typeof loadEmulationBoard>>;
