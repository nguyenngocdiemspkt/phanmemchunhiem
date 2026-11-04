import { notFound } from "next/navigation";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { addDays, fmtShortDate, toDateInput, weekStart } from "./format";

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

export type GroupStanding = { groupNo: number; members: number; plus: number; minus: number; total: number; rank: number };

function rankGroups(
  groupCount: number,
  records: { groupNo: number; points: number }[],
  members: Map<number, number>,
): GroupStanding[] {
  const rows: GroupStanding[] = Array.from({ length: groupCount }, (_, i) => ({
    groupNo: i + 1,
    members: members.get(i + 1) ?? 0,
    plus: 0,
    minus: 0,
    total: 0,
    rank: 0,
  }));
  for (const r of records) {
    const row = rows[r.groupNo - 1];
    if (!row) continue;
    if (r.points > 0) row.plus += r.points;
    else row.minus += r.points;
    row.total += r.points;
  }
  // Bằng điểm thì đồng hạng
  for (const row of rows) row.rank = 1 + rows.filter((o) => o.total > row.total).length;
  return rows.sort((a, b) => a.rank - b.rank || a.groupNo - b.groupNo);
}

const CHART_WEEKS = 8;

/** Toàn bộ dữ liệu cho bảng thi đua của một lớp trong một tuần. */
export async function loadEmulationBoard(classId: string, groupCount: number, week: { start: Date; end: Date }) {
  const chartFrom = addDays(week.start, -7 * (CHART_WEEKS - 1));
  const [allRecords, weekRecords, students, categories] = await Promise.all([
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
      select: { id: true, groupNo: true, isMonitor: true, user: { select: { fullName: true } } },
    }),
    ensureCategories(classId),
  ]);

  const lastWord = (s: string) => s.trim().split(/\s+/).at(-1) ?? s;
  students.sort(
    (a, b) =>
      lastWord(a.user.fullName).localeCompare(lastWord(b.user.fullName), "vi") ||
      a.user.fullName.localeCompare(b.user.fullName, "vi"),
  );

  const members = new Map<number, number>();
  for (const s of students) if (s.groupNo) members.set(s.groupNo, (members.get(s.groupNo) ?? 0) + 1);

  // Biểu đồ: tổng điểm từng tuần của mỗi tổ, CHART_WEEKS tuần gần nhất tính đến tuần đang xem
  const chart = Array.from({ length: CHART_WEEKS }, (_, i) => {
    const start = addDays(chartFrom, 7 * i);
    const row: Record<string, string | number> = { label: fmtShortDate(start) };
    for (let g = 1; g <= groupCount; g++) row[`g${g}`] = 0;
    return { start, end: addDays(start, 7), row };
  });
  for (const r of allRecords) {
    if (r.groupNo > groupCount) continue;
    const bucket = chart.find((c) => r.date >= c.start && r.date < c.end);
    if (bucket) bucket.row[`g${r.groupNo}`] = (bucket.row[`g${r.groupNo}`] as number) + r.points;
  }

  return {
    weekly: rankGroups(groupCount, weekRecords, members),
    overall: rankGroups(groupCount, allRecords, members),
    chart: chart.map((c) => c.row),
    hasChartData: allRecords.some((r) => r.date >= chartFrom && r.date < week.end),
    records: weekRecords,
    students: students.map((s) => ({ id: s.id, name: s.user.fullName, groupNo: s.groupNo, isMonitor: s.isMonitor })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, points: c.points })),
  };
}

export type EmulationBoardData = Awaited<ReturnType<typeof loadEmulationBoard>>;
