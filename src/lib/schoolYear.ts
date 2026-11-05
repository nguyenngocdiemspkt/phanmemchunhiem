import { prisma } from "./db";
import { addDays, fromDateInput, weekStart } from "./format";

export type YearLike = { startDate: Date; semester2Start: Date; endDate: Date };

/** "2026-2027" -> 2026; sai định dạng -> null */
export function firstYearOf(name: string) {
  const m = name.trim().match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;
  const y1 = Number(m[1]);
  return Number(m[2]) === y1 + 1 ? y1 : null;
}

/** Ngày gợi ý cho năm học bắt đầu năm y1 (giờ VN): 05/09, HK II 12/01, kết thúc 31/05 */
export function defaultYearDates(y1: number) {
  return {
    startDate: fromDateInput(`${y1}-09-05`)!,
    semester2Start: fromDateInput(`${y1 + 1}-01-12`)!,
    endDate: fromDateInput(`${y1 + 1}-05-31`)!,
  };
}

/** Năm học mặc định theo ngày hiện tại (năm học bắt đầu từ tháng 8) */
export function suggestedYearName(now = new Date()) {
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/** Tuần học thứ mấy (tuần 1 là tuần chứa ngày khai giảng), null nếu trước ngày bắt đầu */
export function weekNumber(year: YearLike, d: Date) {
  const first = weekStart(year.startDate);
  if (d < first) return null;
  return Math.floor((weekStart(d).getTime() - first.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

/** Khoảng [thứ Hai, thứ Hai tuần sau) của tuần học số n */
export function weekRangeOf(year: YearLike, n: number) {
  const start = addDays(weekStart(year.startDate), (n - 1) * 7);
  return { start, end: addDays(start, 7) };
}

export function semesterOf(year: YearLike, d: Date): 1 | 2 {
  return d < year.semester2Start ? 1 : 2;
}

export function validateYearDates(y: YearLike): string | null {
  if (!(y.startDate < y.semester2Start)) return "Ngày bắt đầu học kỳ II phải sau ngày bắt đầu năm học.";
  if (!(y.semester2Start < y.endDate)) return "Ngày kết thúc năm học phải sau ngày bắt đầu học kỳ II.";
  return null;
}

export function listSchoolYears() {
  return prisma.schoolYear.findMany({ orderBy: { name: "desc" } });
}

export async function currentSchoolYear() {
  return (
    (await prisma.schoolYear.findFirst({ where: { isCurrent: true } })) ??
    (await prisma.schoolYear.findFirst({ orderBy: { startDate: "desc" } }))
  );
}

/** Lớp thuộc năm học đã khóa thì chỉ được xem. Trả về thông báo lỗi, hoặc null nếu được sửa. */
export async function classLockedMessage(classroom: { schoolYear: string }) {
  const year = await prisma.schoolYear.findUnique({ where: { name: classroom.schoolYear }, select: { locked: true } });
  return year?.locked ? `Năm học ${classroom.schoolYear} đã khóa, dữ liệu chỉ còn được xem.` : null;
}
