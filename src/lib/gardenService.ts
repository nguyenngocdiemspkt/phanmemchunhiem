import type { GardenCycle } from "@prisma/client";
import { prisma } from "./db";
import { addDays } from "./format";
import { gardenLayout, parseCharacter, plantState, plotPos, type GardenThresholds } from "./garden";
import { byVietnameseName } from "./students";

type YearDates = { name: string; startDate: Date; semester2Start: Date; endDate: Date };
export type GardenCycleInfo = { key: string; label: string; start: Date; end: Date };

/** Chu kỳ trồng cây chứa thời điểm `at`: học kỳ I/II hoặc cả năm học, theo cài đặt của lớp */
export function cycleOf(year: YearDates, mode: GardenCycle, at = new Date()): GardenCycleInfo {
  const yearEnd = addDays(year.endDate, 1);
  if (mode === "YEAR") return { key: `${year.name}-CN`, label: `Năm học ${year.name}`, start: year.startDate, end: yearEnd };
  return at < year.semester2Start
    ? { key: `${year.name}-HK1`, label: `Học kỳ I, ${year.name}`, start: year.startDate, end: year.semester2Start }
    : { key: `${year.name}-HK2`, label: `Học kỳ II, ${year.name}`, start: year.semester2Start, end: yearEnd };
}

/** Ngược lại từ khóa chu kỳ (vd "2026-2027-HK1") ra khoảng thời gian, cần mốc của năm học */
function cycleFromKey(key: string, years: Map<string, YearDates>): GardenCycleInfo | null {
  const m = key.match(/^(\d{4}-\d{4})-(HK1|HK2|CN)$/);
  const year = m && years.get(m[1]);
  if (!m || !year) return null;
  if (m[2] === "CN") return cycleOf(year, "YEAR");
  return cycleOf(year, "SEMESTER", m[2] === "HK1" ? year.startDate : year.semester2Start);
}

export type GardenBreakdown = {
  /** Σ(điểm phiếu tuần đã duyệt − điểm gốc) */
  sheets: number;
  /** Tổng điểm việc tốt đã duyệt (làm việc tốt + được hỗ trợ) */
  deeds: number;
  /** Các việc tốt đã duyệt trong chu kỳ, mới nhất trước */
  deedList: { title: string; points: number; helped: boolean }[];
};

/**
 * Phần cộng/trừ vào điểm vườn của nhiều học sinh trong một khoảng thời gian, 2 truy vấn cho cả lớp.
 * Điểm vườn = điểm khởi đầu của lớp + sheets + deeds.
 */
export async function gardenBreakdown(studentIds: string[], range: { start: Date; end: Date }) {
  const result = new Map<string, GardenBreakdown>(studentIds.map((id) => [id, { sheets: 0, deeds: 0, deedList: [] }]));
  if (studentIds.length === 0) return result;
  const [sheets, deeds] = await Promise.all([
    prisma.response.findMany({
      where: {
        studentId: { in: studentIds },
        status: "APPROVED",
        points: { not: null },
        survey: { baseScore: { not: null }, openAt: { gte: range.start, lt: range.end } },
      },
      select: { studentId: true, points: true, survey: { select: { baseScore: true } } },
    }),
    prisma.goodDeed.findMany({
      where: {
        status: "APPROVED",
        reviewedAt: { gte: range.start, lt: range.end },
        OR: [{ authorId: { in: studentIds } }, { beneficiaryId: { in: studentIds } }],
      },
      orderBy: { reviewedAt: "desc" },
      select: { title: true, authorId: true, beneficiaryId: true, authorPoints: true, beneficiaryPoints: true },
    }),
  ]);
  for (const s of sheets) {
    const r = result.get(s.studentId);
    if (r) r.sheets += s.points! - s.survey.baseScore!;
  }
  for (const d of deeds) {
    const author = result.get(d.authorId);
    if (author && d.authorPoints) {
      author.deeds += d.authorPoints;
      author.deedList.push({ title: d.title, points: d.authorPoints, helped: false });
    }
    const helped = d.beneficiaryId ? result.get(d.beneficiaryId) : undefined;
    if (helped && d.beneficiaryPoints) {
      helped.deeds += d.beneficiaryPoints;
      helped.deedList.push({ title: d.title, points: d.beneficiaryPoints, helped: true });
    }
  }
  return result;
}

/** Tổng phần cộng/trừ (sheets + deeds) của từng học sinh */
export async function gardenPoints(studentIds: string[], range: { start: Date; end: Date }) {
  const detail = await gardenBreakdown(studentIds, range);
  return new Map([...detail].map(([id, d]) => [id, d.sheets + d.deeds]));
}

/**
 * Sang chu kỳ mới: ghi kết quả chu kỳ cũ vào bộ sưu tập của các em đang trồng cây chu kỳ trước,
 * rồi trả cây về hạt để em chọn hạt mới. Gom theo chu kỳ để số truy vấn không phụ thuộc số học sinh.
 */
export async function harvestOldCycles(
  classroom: GardenThresholds & { id: string },
  students: { id: string; seedType: string | null; seedCycle: string | null }[],
  current: GardenCycleInfo,
) {
  const stale = students.filter((s) => s.seedType && s.seedCycle && s.seedCycle !== current.key);
  if (stale.length === 0) return 0;
  const years = new Map((await prisma.schoolYear.findMany()).map((y) => [y.name, y]));
  const byCycle = new Map<string, typeof stale>();
  for (const s of stale) byCycle.set(s.seedCycle!, [...(byCycle.get(s.seedCycle!) ?? []), s]);

  const harvests: { studentId: string; classId: string; cycle: string; cycleLabel: string; seedType: string; score: number; leaves: number; fruits: number; wilt: number }[] = [];
  for (const [key, group] of byCycle) {
    const cycle = cycleFromKey(key, years);
    if (!cycle) continue;
    const points = await gardenPoints(group.map((s) => s.id), cycle);
    for (const s of group) {
      const score = classroom.gardenStart + (points.get(s.id) ?? 0);
      const state = plantState(score, classroom);
      harvests.push({ studentId: s.id, classId: classroom.id, cycle: key, cycleLabel: cycle.label, seedType: s.seedType!, score, leaves: state.leaves, fruits: state.fruits, wilt: state.wilt });
    }
  }
  await prisma.$transaction([
    prisma.gardenHarvest.createMany({ data: harvests, skipDuplicates: true }),
    prisma.student.updateMany({ where: { id: { in: stale.map((s) => s.id) } }, data: { seedType: null, seedCycle: null } }),
  ]);
  return harvests.length;
}

/**
 * Dữ liệu khu vườn của lớp: ô đất của từng học sinh đang học (theo thứ tự tên), nhân vật, cây và điểm nuôi cây.
 * Học sinh sang chu kỳ mới được tự thu hoạch trước khi hiển thị.
 */
export async function loadGarden(classId: string) {
  const classroom = await prisma.classroom.findUniqueOrThrow({ where: { id: classId }, include: { year: true } });
  const cycle = cycleOf(classroom.year, classroom.gardenCycle);
  const select = {
    id: true,
    seedType: true,
    seedCycle: true,
    character: true,
    posX: true,
    posY: true,
    user: { select: { id: true, fullName: true } },
  } as const;
  let students = await prisma.student.findMany({ where: { classId, status: "ACTIVE" }, select });
  if (await harvestOldCycles(classroom, students, cycle)) {
    students = await prisma.student.findMany({ where: { classId, status: "ACTIVE" }, select });
  }
  students.sort(byVietnameseName((s) => s.user.fullName));
  const detail = await gardenBreakdown(
    students.map((s) => s.id),
    cycle,
  );
  const plots = students.map((s, i) => {
    const d = detail.get(s.id) ?? { sheets: 0, deeds: 0, deedList: [] };
    const score = classroom.gardenStart + d.sheets + d.deeds;
    const planted = !!s.seedType && s.seedCycle === cycle.key;
    const home = plotPos(i);
    return {
      id: s.id,
      name: s.user.fullName,
      character: parseCharacter(s.character, s.id),
      hasCharacter: s.character != null,
      seed: planted ? s.seedType : null,
      score,
      fromSheets: d.sheets,
      fromDeeds: d.deeds,
      deeds: d.deedList.slice(0, 5),
      state: plantState(score, classroom),
      plot: i,
      // Chưa đi lần nào thì đứng ngay dưới ô đất của mình (không che cây)
      x: s.posX ?? home.x,
      y: s.posY ?? home.y + 2,
    };
  });
  return { classroom, cycle, plots, layout: gardenLayout(students.length) };
}

export type GardenPlot = Awaited<ReturnType<typeof loadGarden>>["plots"][number];
