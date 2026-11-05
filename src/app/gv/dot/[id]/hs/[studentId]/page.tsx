import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { buildFeedbackDraft, findOption, findUrgentKeywords, parseAnswers, parseQuestions } from "@/lib/questions";
import { studentFlags } from "@/lib/insights";
import { effectiveCounts, parseCounts, parseCriteria, rating, RESPONSE_STATUS, signed, type Counts } from "@/lib/scoring";
import { byVietnameseName } from "@/lib/students";
import { Badge, FlagList, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ParentNotifyButtons } from "@/components/ParentNotify";
import { buildParentMessage, ensureParentTokens, parentLink, siteUrl, smsPhone } from "@/lib/parent";
import { FeedbackEditor } from "./FeedbackEditor";
import { ScorePanel } from "./ScorePanel";
import { decideReportAction, resetScoresAction } from "./actions";

const REPORT_STATUS = {
  PENDING: { label: "Chờ xác nhận", style: "bg-amber-50 text-amber-800 ring-amber-200" },
  ACCEPTED: { label: "Đã chấp nhận", style: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  REJECTED: { label: "Đã bỏ qua", style: "bg-slate-100 text-slate-500 ring-slate-200" },
} as const;

export default async function ResponseReviewPage({ params }: { params: Promise<{ id: string; studentId: string }> }) {
  const { id, studentId } = await params;
  const survey = await prisma.survey.findUnique({ where: { id }, include: { classroom: true } });
  if (!survey) notFound();
  await requireClassAccess(survey.classId);

  const [student, response, prev, classmates, reports] = await Promise.all([
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
    prisma.student.findMany({
      where: { classId: survey.classId, OR: [{ status: "ACTIVE" }, { responses: { some: { surveyId: id } } }] },
      select: { id: true, user: { select: { fullName: true } } },
    }),
    prisma.scoreReport.findMany({ where: { surveyId: id, studentId }, orderBy: { createdAt: "asc" } }),
  ]);
  if (!student) notFound();

  // Học sinh trước/sau theo tên để giáo viên duyệt liên tục
  classmates.sort(byVietnameseName((s) => s.user.fullName));
  const idx = classmates.findIndex((s) => s.id === studentId);
  const prevStudent = idx > 0 ? classmates[idx - 1] : undefined;
  const nextStudent = idx >= 0 && idx < classmates.length - 1 ? classmates[idx + 1] : undefined;

  const questions = parseQuestions(survey.questions);
  const answers = parseAnswers(response?.answers);
  const urgentWords = response ? findUrgentKeywords(questions, answers) : [];
  const flags = studentFlags({ questions: survey.questions, current: response, previous: prev });
  const goals = Array.isArray(response?.feedback?.goals) ? (response.feedback.goals as unknown[]).map(String) : [];

  // Chấm điểm theo tiêu chí
  const criteria = parseCriteria(survey.criteria);
  const scoring = criteria.length > 0 && survey.baseScore != null;
  const accepted = reports.filter((r) => r.status === "ACCEPTED" && r.criterionId);
  const self = parseCounts(response?.selfCounts);
  const fromReports: Counts = {};
  for (const r of accepted) fromReports[r.criterionId!] = (fromReports[r.criterionId!] ?? 0) + r.times;
  const teacher = response?.teacherCounts == null ? null : parseCounts(response.teacherCounts);
  const effective = effectiveCounts(criteria, self, teacher, accepted);
  const pendingReports = reports.filter((r) => r.status === "PENDING");

  // Tin báo phụ huynh, chỉ có sau khi giáo viên đã duyệt
  const published = response?.status === "APPROVED" && response.feedback?.published ? response.feedback : null;
  let parentMessage = "";
  if (published) {
    const tokens = await ensureParentTokens([student]);
    parentMessage = buildParentMessage({
      className: survey.classroom.name,
      studentName: student.user.fullName,
      surveyTitle: survey.title,
      score: response!.score,
      points: response!.points != null ? { value: response!.points, rating: rating(response!.points, survey.classroom).label } : null,
      feedback: published.content,
      teacherName: published.teacher?.fullName,
      link: parentLink(await siteUrl(), tokens.get(student.id)!),
    });
  }

  return (
    <>
      <PageHeader
        title={student.user.fullName}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            {survey.title} · Lớp {survey.classroom.name}
            {response ? (
              <Badge className={RESPONSE_STATUS[response.status].style}>{RESPONSE_STATUS[response.status].label}</Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Chưa nộp</Badge>
            )}
          </span>
        }
        back={{ href: `/gv/dot/${id}`, label: survey.title }}
        actions={
          <>
            {prevStudent && (
              <Link href={`/gv/dot/${id}/hs/${prevStudent.id}`} className="btn-secondary btn-sm">
                ← {prevStudent.user.fullName}
              </Link>
            )}
            {nextStudent && (
              <Link href={`/gv/dot/${id}/hs/${nextStudent.id}`} className="btn-secondary btn-sm">
                {nextStudent.user.fullName} →
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-4">
          {response?.urgent && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
              <b>⚠ Cần xử lý ngay:</b> câu trả lời có nội dung liên quan đến{" "}
              {urgentWords.length ? <i>{urgentWords.join(", ")}</i> : "an toàn của học sinh"}. Thầy/cô hãy gặp riêng em sớm nhất có thể và
              phối hợp với nhà trường, phụ huynh khi cần.
            </div>
          )}

          {scoring && (
            <div className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">Điểm thi đua tuần</h2>
                {response?.points != null && (
                  <span className="flex items-center gap-2">
                    <b className="text-lg">{response.points}</b>
                    <Badge className={rating(response.points, survey.classroom).style}>{rating(response.points, survey.classroom).label}</Badge>
                  </span>
                )}
              </div>
              <ScorePanel
                surveyId={id}
                studentId={studentId}
                criteria={criteria}
                baseScore={survey.baseScore!}
                self={self}
                fromReports={fromReports}
                effective={effective}
                hasResponse={!!response}
              />
              {teacher && response && (
                <form action={resetScoresAction.bind(null, response.id)} className="mt-2">
                  <SubmitButton className="text-xs text-slate-500 underline hover:text-teal-700" pendingText="...">
                    Bỏ số đã chốt, dùng lại số tự khai + bổ sung đã chấp nhận
                  </SubmitButton>
                </form>
              )}
            </div>
          )}

          {reports.length > 0 && (
            <div className="card">
              <h2 className="mb-1 font-semibold">Tổ trưởng nhận xét / bổ sung</h2>
              <p className="mb-3 text-xs text-slate-500">Bổ sung chỉ được tính điểm và cho học sinh thấy khi thầy/cô chấp nhận.</p>
              <ul className="divide-y divide-slate-100">
                {reports.map((r) => (
                  <li key={r.id} className="py-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={REPORT_STATUS[r.status].style}>{REPORT_STATUS[r.status].label}</Badge>
                      <span className="font-medium">
                        {r.criterionName ? `${r.criterionName} × ${r.times} (${signed(r.points * r.times)} điểm)` : "Nhận xét"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {r.reporterName} · {fmtDateTime(r.createdAt)}
                      </span>
                    </div>
                    {r.note && <p className="mt-1 whitespace-pre-line text-slate-700">{r.note}</p>}
                    {r.status === "PENDING" && (
                      <div className="mt-2 flex gap-2">
                        <form action={decideReportAction.bind(null, r.id, true)}>
                          <SubmitButton className="btn-primary btn-sm" pendingText="...">
                            Chấp nhận
                          </SubmitButton>
                        </form>
                        <form action={decideReportAction.bind(null, r.id, false)}>
                          <SubmitButton className="btn-secondary btn-sm" pendingText="...">
                            Bỏ qua
                          </SubmitButton>
                        </form>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {response && questions.length > 0 && (
            <div className="card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-500">
                  {Object.keys(answers).length ? `Nộp lúc ${fmtDateTime(response.submittedAt)}` : "Giáo viên chấm thay, học sinh chưa trả lời"}
                </span>
                {response.score != null && (
                  <span>
                    Mức tự đánh giá: <b>{response.score}%</b>
                    {prev?.score != null && (
                      <span className={response.score >= prev.score ? "text-emerald-700" : "text-amber-700"}>
                        {" "}
                        ({response.score >= prev.score ? "+" : ""}
                        {response.score - prev.score} so với đợt trước)
                      </span>
                    )}
                  </span>
                )}
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
                      <div className={`mt-1 rounded-lg px-3 py-2 text-sm ${opt?.alert ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-800"}`}>
                        {q.type === "single"
                          ? (opt?.label ?? <i className="text-slate-400">Không trả lời</i>)
                          : answers[q.id]?.trim() || <i className="text-slate-400">Không trả lời</i>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {!response && !scoring && <div className="card text-sm text-slate-600">Học sinh chưa nộp phiếu ở đợt này.</div>}
        </div>

        {response && (
          <div className="h-fit space-y-4 lg:sticky lg:top-20">
            <div className="card">
              {pendingReports.length > 0 && (
                <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Còn {pendingReports.length} bổ sung của tổ trưởng chờ xác nhận. Hãy xác nhận trước khi duyệt.
                </p>
              )}
              <FeedbackEditor
                key={response.id}
                responseId={response.id}
                status={response.status}
                reviewNote={response.reviewNote}
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
                <p className="text-sm text-slate-500">Sau khi duyệt phiếu, nút nhắn tin cho phụ huynh sẽ hiện ở đây.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
