import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDateTime, surveyStatus } from "@/lib/format";
import { parseAnswers, parseQuestions } from "@/lib/questions";
import { PageHeader } from "@/components/ui";
import { FeedbackCard, goalsOf } from "@/components/FeedbackCard";
import { SurveyForm } from "./SurveyForm";

export default async function StudentSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { student } = await requireStudent();
  const survey = await prisma.survey.findUnique({ where: { id } });
  if (!survey || survey.classId !== student.classId) notFound();

  const response = await prisma.response.findUnique({
    where: { surveyId_studentId: { surveyId: id, studentId: student.id } },
    include: { feedback: { include: { teacher: { select: { fullName: true } } } } },
  });
  const status = surveyStatus(survey);
  if (status === "upcoming") notFound();
  const readOnly = status !== "open";

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Phiếu tự đánh giá"
        subtitle={`${survey.title} · ${readOnly ? "Đã đóng" : `Hạn nộp ${fmtDateTime(survey.closeAt)}`}`}
        back={{ href: "/hs", label: "Trang chính" }}
      />
      {response && !readOnly && (
        <p className="mb-4 rounded-xl bg-sky-50 p-3 text-sm text-sky-900">
          Em đã nộp lúc {fmtDateTime(response.submittedAt)}. Em có thể sửa và gửi lại trước khi hết hạn.
        </p>
      )}
      {readOnly && !response && <p className="mb-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-600">Em đã không nộp phiếu này.</p>}
      {response?.feedback?.published && (
        <div className="mb-4">
          <FeedbackCard
            title="Phản hồi của thầy/cô"
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
        />
      )}
    </div>
  );
}
