import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { computePoints, effectiveCounts, parseCounts, parseCriteria } from "./scoring";

type Db = Prisma.TransactionClient | typeof prisma;

/** Tính lại điểm thi đua của một phiếu sau mỗi thay đổi (HS nộp, GV chốt, GV chấp nhận bổ sung). */
export async function recomputePoints(db: Db, responseId: string) {
  const response = await db.response.findUnique({
    where: { id: responseId },
    include: { survey: { select: { id: true, criteria: true, baseScore: true } } },
  });
  if (!response) return null;
  const criteria = parseCriteria(response.survey.criteria);
  if (criteria.length === 0 || response.survey.baseScore == null) {
    if (response.points !== null) await db.response.update({ where: { id: responseId }, data: { points: null } });
    return null;
  }
  const accepted = await db.scoreReport.findMany({
    where: { surveyId: response.surveyId, studentId: response.studentId, status: "ACCEPTED", criterionId: { not: null } },
    select: { criterionId: true, times: true },
  });
  const teacher = response.teacherCounts == null ? null : parseCounts(response.teacherCounts);
  const counts = effectiveCounts(criteria, parseCounts(response.selfCounts), teacher, accepted);
  const points = computePoints(response.survey.baseScore, criteria, counts);
  if (points !== response.points) await db.response.update({ where: { id: responseId }, data: { points } });
  return points;
}

/** Bản chụp tiêu chí hiện tại của lớp, để gắn vào đợt mới */
export async function criteriaSnapshot(classId: string) {
  const categories = await prisma.emulationCategory.findMany({ where: { classId }, orderBy: { sortOrder: "asc" } });
  return categories.map((c) => ({ id: c.id, name: c.name, points: c.points }));
}
