import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { buildFeedbackDraft, findOption, findUrgentKeywords, parseAnswers, parseQuestions } from "@/lib/questions";
import { studentFlags } from "@/lib/insights";
import { FlagList, PageHeader } from "@/components/ui";
import { ParentNotifyButtons } from "@/components/ParentNotify";
import { buildParentMessage, ensureParentTokens, parentLink, siteUrl, smsPhone } from "@/lib/parent";
import { FeedbackEditor } from "./FeedbackEditor";

export default async function ResponseReviewPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const survey = await prisma.survey.findUnique({ where: { id }, include: { classroom: true } });
  if (!survey) notFound();
  await requireClassAccess(survey.classId);

  const [student, response, prev, siblings] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, classId: survey.classId }, include: { user: true } }),
    prisma.response.findUnique({
      where: { surveyId_studentId: { surveyId: id, studentId } },
      include: { feedback: { include: { teacher: { select: { fullName: true } } } } },
    }),
    prisma.response.findFirst({
      where: { studentId, survey: { classId: survey.classId, openAt: { lt: survey.openAt } } },
      orderBy: { survey: { openAt: "desc" } },
      select: { score: true, urgent: true, answers: true },
    }),
    prisma.response.findMany({
      where: { surveyId: id },
      select: { studentId: true, student: { select: { user: { select: { fullName: true } } } } },
    }),
  ]);
  if (!student) notFound();

  // Học sinh trước/sau theo tên để giáo viên nhận xét liên tục
  const ordered = siblings.sort((a, b) => a.student.user.fullName.localeCompare(b.student.user.fullName, "vi"));
  const idx = ordered.findIndex((s) => s.studentId === studentId);
  const prevStudent = idx > 0 ? ordered[idx - 1] : undefined;
  const nextStudent = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : undefined;

  const questions = parseQuestions(survey.questions);
  const answers = parseAnswers(response?.answers);
  const urgentWords = response ? findUrgentKeywords(questions, answers) : [];
  const flags = studentFlags({ questions: survey.questions, current: response, previous: prev });
  const goals = Array.isArray(response?.feedback?.goals) ? (response.feedback.goals as unknown[]).map(String) : [];

  // Tin báo phụ huynh, chỉ có sau khi giáo viên đã gửi nhận xét
  const published = response?.feedback?.published ? response.feedback : null;
  let parentMessage = "";
  if (published) {
    const tokens = await ensureParentTokens([student]);
    parentMessage = buildParentMessage({
      className: survey.classroom.name,
      studentName: student.user.fullName,
      surveyTitle: survey.title,
      score: response!.score,
      feedback: published.content,
      teacherName: published.teacher?.fullName,
      link: parentLink(await siteUrl(), tokens.get(student.id)!),
    });
  }

  return (
    <>
      <PageHeader
        title={student.user.fullName}
        subtitle={`${survey.title} · Lớp ${survey.classroom.name}`}
        back={{ href: `/gv/dot/${id}`, label: survey.title }}
        actions={
          <>
            {prevStudent && (
              <Link href={`/gv/dot/${id}/hs/${prevStudent.studentId}`} className="btn-secondary btn-sm">
                ← {prevStudent.student.user.fullName}
              </Link>
            )}
            {nextStudent && (
              <Link href={`/gv/dot/${id}/hs/${nextStudent.studentId}`} className="btn-secondary btn-sm">
                {nextStudent.student.user.fullName} →
              </Link>
            )}
          </>
        }
      />

      {!response ? (
        <div className="card text-sm text-slate-600">Học sinh chưa nộp phiếu ở đợt này.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-4">
            {response.urgent && (
              <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
                <b>⚠ Cần xử lý ngay:</b> câu trả lời có nội dung liên quan đến{" "}
                {urgentWords.length ? <i>{urgentWords.join(", ")}</i> : "an toàn của học sinh"}. Thầy/cô hãy gặp riêng em sớm nhất có thể
                và phối hợp với nhà trường, phụ huynh khi cần.
              </div>
            )}
            <div className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">Nộp lúc {fmtDateTime(response.submittedAt)}</span>
                <span>
                  Mức tự đánh giá: <b>{response.score != null ? `${response.score}%` : "—"}</b>
                  {prev?.score != null && response.score != null && (
                    <span className={response.score >= prev.score ? "text-emerald-700" : "text-amber-700"}>
                      {" "}
                      ({response.score >= prev.score ? "+" : ""}
                      {response.score - prev.score} so với đợt trước)
                    </span>
                  )}
                </span>
              </div>
              <FlagList flags={flags} />
              <ol className="mt-4 space-y-4">
                {questions.map((q, i) => {
                  const opt = findOption(q, answers);
                  return (
                    <li key={q.id}>
                      <div className="text-sm font-medium text-slate-700">
                        {i + 1}. {q.text}
                      </div>
                      <div
                        className={`mt-1 rounded-lg px-3 py-2 text-sm ${
                          opt?.alert ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-800"
                        }`}
                      >
                        {q.type === "single" ? opt?.label ?? <i className="text-slate-400">Không trả lời</i> : answers[q.id]?.trim() || <i className="text-slate-400">Không trả lời</i>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="h-fit space-y-4 lg:sticky lg:top-20">
            <div className="card">
              <FeedbackEditor
                key={response.id}
                responseId={response.id}
                published={!!response.feedback?.published}
                initial={response.feedback ? { content: response.feedback.content, goals } : null}
                draft={buildFeedbackDraft(questions, answers, { score: response.score, previousScore: prev?.score })}
              />
            </div>
            <div className="card">
              <h2 className="mb-2 font-semibold">Báo cho phụ huynh</h2>
              {published ? (
                <>
                  <p className="mb-2 text-xs text-slate-500">
                    Bấm nút dưới đây trên điện thoại để mở tin nhắn đã soạn sẵn
                    {student.parentName ? ` gửi ${student.parentName}` : ""}. Tin nhắn gửi từ số của thầy/cô, phần mềm không tốn phí.
                  </p>
                  <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-sm text-slate-700">{parentMessage}</pre>
                  <ParentNotifyButtons
                    feedbackId={published.id}
                    studentId={student.id}
                    phone={smsPhone(student.parentPhone)}
                    message={parentMessage}
                    notifiedAt={published.parentNotifiedAt ? fmtDateTime(published.parentNotifiedAt) : null}
                  />
                </>
              ) : (
                <p className="text-sm text-slate-500">Sau khi bấm Gửi nhận xét, nút nhắn tin cho phụ huynh sẽ hiện ở đây.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
