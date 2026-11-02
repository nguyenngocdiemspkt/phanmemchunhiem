import { prisma } from "./db";

/** Đợt đã mở gần nhất của mỗi lớp + số học sinh đã nộp, dùng cho các trang danh sách lớp. */
export async function latestSurveyStats(classIds: string[]) {
  const now = new Date();
  const surveys = await prisma.survey.findMany({
    where: { classId: { in: classIds }, openAt: { lte: now } },
    orderBy: { openAt: "desc" },
    distinct: ["classId"],
    select: {
      id: true,
      classId: true,
      title: true,
      openAt: true,
      closeAt: true,
      _count: { select: { responses: true } },
      responses: { where: { urgent: true }, select: { id: true } },
    },
  });
  return new Map(surveys.map((s) => [s.classId, s]));
}
