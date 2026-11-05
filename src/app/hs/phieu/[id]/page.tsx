import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDateTime, surveyStatus } from "@/lib/format";
import { parseAnswers, parseQuestions } from "@/lib/questions";
import { effectiveCounts, parseCounts, parseCriteria, rating, RESPONSE_STATUS, signed } from "@/lib/scoring";
import { Badge, PageHeader } from "@/components/ui";
import { FeedbackCard, goalsOf } from "@/components/FeedbackCard";
import { SurveyForm } from "./SurveyForm";

export default async function StudentSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { student } = await requireStudent();
  const survey = await prisma.survey.findUnique({ where: { id }, include: { classroom: true } });
  if (!survey) notFound();

  const response = await prisma.response.findUnique({
    where: { surveyId_studentId: { surveyId: id, studentId: student.id } },
    include: { feedback: { include: { teacher: { select: { fullName: true } } } } },
  });
  // Phiếu của lớp cũ (trước khi chuyển lớp) vẫn xem lại được nếu em đã nộp, nhưng không sửa được
  const ownClass = survey.classId === student.classId;
  if (!ownClass && !response) notFound();
  const status = surveyStatus(survey);
  if (status === "upcoming") notFound();
  const approved = response?.status === "APPROVED";
  const revision = response?.status === "REVISION";
  // Được sửa khi phiếu đang mở và chưa duyệt, hoặc khi thầy/cô yêu cầu sửa
  const readOnly = !ownClass || approved || (status !== "open" && !revision);

  const criteria = parseCriteria(survey.criteria);
  const scoring = criteria.length > 0 && survey.baseScore != null;
  // Học sinh chỉ thấy bổ sung của tổ trưởng đã được thầy/cô chấp nhận
  const accepted = scoring && response ? await prisma.scoreReport.findMany({ where: { surveyId: id, studentId: student.id, status: "ACCEPTED" } }) : [];
  const finalCounts = approved
    ? effectiveCounts(criteria, parseCounts(response!.selfCounts), response!.teacherCounts == null ? null : parseCounts(response!.teacherCounts), accepted)
    : parseCounts(response?.selfCounts);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Phiếu tự đánh giá"
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {survey.title} · {status === "open" ? `Hạn nộp ${fmtDateTime(survey.closeAt)}` : "Đã đóng"}
            {response && <Badge className={RESPONSE_STATUS[response.status].style}>{RESPONSE_STATUS[response.status].label}</Badge>}
          </span>
        }
        back={{ href: "/hs", label: "Trang chính" }}
      />
      {revision && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Thầy/cô nhờ em sửa phiếu:</b>
          <p className="mt-1 whitespace-pre-line">{response!.reviewNote}</p>
          <p className="mt-2 text-xs">Em sửa xong bấm &quot;Gửi phiếu&quot; để thầy/cô xem lại.</p>
        </div>
      )}
      {response && !readOnly && !revision && (
        <p className="mb-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
          Em đã nộp lúc {fmtDateTime(response.submittedAt)}. Em có thể sửa và gửi lại trước khi hết hạn hoặc trước khi thầy/cô duyệt.
        </p>
      )}
      {readOnly && !response && <p className="mb-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Em đã không nộp phiếu này.</p>}

      {approved && scoring && response!.points != null && (
        <div className="card mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Kết quả thi đua tuần (đã duyệt)</h2>
            <span className="flex items-center gap-2">
              <b className="text-2xl text-teal-800">{response!.points}</b>
              <Badge className={rating(response!.points!, survey.classroom).style}>{rating(response!.points!, survey.classroom).label}</Badge>
            </span>
          </div>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {criteria
              .filter((c) => finalCounts[c.id])
              .map((c) => (
                <li key={c.id} className="flex justify-between py-1.5">
                  <span>
                    {c.name} × {finalCounts[c.id]}
                  </span>
                  <span className={c.points > 0 ? "text-emerald-700" : "text-red-600"}>{signed(finalCounts[c.id] * c.points)}</span>
                </li>
              ))}
          </ul>
          {accepted.length > 0 && (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
              <div className="mb-1 font-medium">Tổ trưởng ghi nhận thêm</div>
              <ul className="space-y-1">
                {accepted.map((r) => (
                  <li key={r.id}>
                    {r.criterionName ? `${r.criterionName} × ${r.times}` : "Nhận xét"}
                    {r.note ? `: ${r.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {approved && response?.feedback?.published && response.feedback.content.trim() && (
        <div className="mb-4">
          <FeedbackCard
            title="Nhận xét của thầy/cô"
            content={response.feedback.content}
            goals={goalsOf(response.feedback.goals)}
            teacher={response.feedback.teacher?.fullName}
            date={response.feedback.publishedAt}
          />
        </div>
      )}
      {(!readOnly || response) && (
        <SurveyForm
          surveyId={id}
          questions={parseQuestions(survey.questions)}
          initial={parseAnswers(response?.answers)}
          readOnly={readOnly}
          scoring={scoring && !approved ? { criteria, baseScore: survey.baseScore!, counts: parseCounts(response?.selfCounts) } : null}
        />
      )}
    </div>
  );
}
