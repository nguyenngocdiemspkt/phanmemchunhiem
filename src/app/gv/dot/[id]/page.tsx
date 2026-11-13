import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDateTime, percent, surveyStatus, toLocalInput } from "@/lib/format";
import { parseAnswers, parseQuestions } from "@/lib/questions";
import { flagRank, studentFlags } from "@/lib/insights";
import { Badge, FlagList, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ApproveAllButton, EditSurveyForm } from "../SurveyForms";
import { groupName, parseCriteria, rating, RESPONSE_STATUS } from "@/lib/scoring";
import { closeSurveyNowAction, deleteSurveyAction } from "../actions";
import { ParentNotifyButtons } from "@/components/ParentNotify";
import { buildParentMessage, ensureParentTokens, parentLink, siteUrl, smsPhone } from "@/lib/parent";

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await prisma.survey.findUnique({ where: { id }, include: { classroom: true } });
  if (!survey) notFound();
  const { user } = await requireClassAccess(survey.classId);

  const [students, responses, prevSurvey, pendingReports] = await Promise.all([
    prisma.student.findMany({
      where: { classId: survey.classId, OR: [{ user: { active: true } }, { responses: { some: { surveyId: id } } }] },
      include: { user: { select: { fullName: true } } },
    }),
    prisma.response.findMany({
      where: { surveyId: id },
      include: { feedback: { include: { teacher: { select: { fullName: true } } } } },
    }),
    prisma.survey.findFirst({
      where: { classId: survey.classId, openAt: { lt: survey.openAt } },
      orderBy: { openAt: "desc" },
      select: { responses: { select: { studentId: true, score: true, urgent: true, answers: true } } },
    }),
    prisma.scoreReport.groupBy({ by: ["studentId"], where: { surveyId: id, status: "PENDING" }, _count: true }),
  ]);
  const scoring = parseCriteria(survey.criteria).length > 0;
  const pendingMap = new Map(pendingReports.map((p) => [p.studentId, p._count]));
  const waiting = responses.filter((r) => r.status === "SUBMITTED").length;
  const approvedCount = responses.filter((r) => r.status === "APPROVED").length;
  // Tổng điểm thi đua của từng tổ trong đợt này (chỉ tính phiếu đã duyệt)
  const groupRows = Array.from({ length: survey.classroom.groupCount }, (_, i) => {
    const members = students.filter((s) => s.groupNo === i + 1);
    const approved = members.map((m) => responses.find((r) => r.studentId === m.id)).filter((r) => r?.status === "APPROVED" && r.points != null);
    // Trung bình điểm các phiếu đã duyệt (sĩ số các tổ khác nhau nên không cộng tổng)
    const sum = approved.reduce((s, r) => s + r!.points!, 0);
    return { no: i + 1, members: members.length, approved: approved.length, avg: approved.length ? Math.round((sum / approved.length) * 10) / 10 : null };
  });

  const questions = parseQuestions(survey.questions);
  const responseMap = new Map(responses.map((r) => [r.studentId, r]));
  const prevMap = new Map(prevSurvey?.responses.map((r) => [r.studentId, r]) ?? []);
  const status = surveyStatus(survey);
  const rate = percent(responses.length, students.length);

  const rows = students
    .map((st) => {
      const r = responseMap.get(st.id);
      const flags = studentFlags({ questions: survey.questions, current: r, previous: prevMap.get(st.id) });
      return { st, r, flags };
    })
    .sort(
      (a, b) =>
        Number(!!b.r) - Number(!!a.r) ||
        flagRank(b.flags) - flagRank(a.flags) ||
        a.st.user.fullName.localeCompare(b.st.user.fullName, "vi"),
    );
  const nameOf = new Map(students.map((s) => [s.id, s.user.fullName]));

  // Tin báo phụ huynh cho các em đã được gửi nhận xét
  const notifiable = rows.filter((x) => x.r?.status === "APPROVED" && x.r.feedback?.published);
  const tokens = await ensureParentTokens(notifiable.map((x) => x.st));
  const base = await siteUrl();
  const parentMessages = new Map(
    notifiable.map(({ st, r }) => [
      st.id,
      buildParentMessage({
        className: survey.classroom.name,
        studentName: st.user.fullName,
        surveyTitle: survey.title,
        score: r!.score,
        points: r!.points != null ? { value: r!.points, rating: rating(r!.points, survey.classroom).label } : null,
        feedback: r!.feedback!.content,
        teacherName: r!.feedback!.teacher?.fullName,
        link: parentLink(base, tokens.get(st.id)!),
      }),
    ]),
  );
  const notifiedCount = notifiable.filter((x) => x.r!.feedback!.parentNotifiedAt).length;

  return (
    <>
      <PageHeader
        title={survey.title}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-2">
            Lớp {survey.classroom.name} · {fmtDateTime(survey.openAt)} → {fmtDateTime(survey.closeAt)}
            <StatusBadge status={status} />
          </span>
        }
        back={{ href: `/gv/lop/${survey.classId}/dot`, label: `Các đợt của lớp ${survey.classroom.name}` }}
      />

      <div className="space-y-6">
        <div className="card">
          <ProgressBar value={rate} />
          <div className="mt-1 text-sm text-slate-600">
            Đã nộp <b>{responses.length}</b>/{students.length} ({rate}%) · Đã duyệt <b>{approvedCount}</b> · Chờ duyệt <b>{waiting}</b> · Đã
            báo phụ huynh <b>{notifiedCount}</b>
          </div>
          <div className="mt-3">
            <ApproveAllButton surveyId={id} waiting={waiting} />
          </div>
        </div>

        {scoring && (
          <div className="card overflow-x-auto">
            <h2 className="mb-1 font-semibold">Điểm thi đua các tổ trong đợt</h2>
            <p className="mb-3 text-xs text-slate-500">Điểm trung bình các phiếu đã duyệt của thành viên trong tổ.</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Tổ</th>
                  <th className="text-center">Phiếu đã duyệt</th>
                  <th className="text-right">Điểm trung bình</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((g) => (
                  <tr key={g.no}>
                    <td>{groupName(survey.classroom.groupNames, g.no)}</td>
                    <td className="text-center">
                      {g.approved}/{g.members}
                    </td>
                    <td className="text-right font-semibold tabular-nums">{g.avg == null ? "—" : g.avg.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Nộp lúc</th>
                <th>Trạng thái</th>
                {scoring && <th className="text-right">Điểm thi đua</th>}
                <th>Dấu hiệu</th>
                <th>Duyệt</th>
                <th>Báo phụ huynh</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ st, r, flags }) => (
                <tr key={st.id}>
                  <td>
                    <Link href={`/gv/hoc-sinh/${st.id}`} className="link">
                      {st.user.fullName}
                    </Link>
                  </td>
                  <td className="text-xs text-slate-600">{r ? fmtDateTime(r.submittedAt) : <span className="text-slate-400">Chưa nộp</span>}</td>
                  <td>
                    {r ? (
                      <Badge className={RESPONSE_STATUS[r.status].style}>{RESPONSE_STATUS[r.status].label}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                    {pendingMap.get(st.id) ? (
                      <div className="mt-1 text-xs text-amber-700">{pendingMap.get(st.id)} bổ sung của tổ trưởng chờ xác nhận</div>
                    ) : null}
                  </td>
                  {scoring && (
                    <td className="text-right">
                      {r?.points != null ? (
                        <span className="inline-flex items-center gap-1">
                          <b className="tabular-nums">{r.points}</b>
                          <Badge className={rating(r.points, survey.classroom).style}>{rating(r.points, survey.classroom).label}</Badge>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td className="max-w-xs">
                    <FlagList flags={flags} />
                  </td>
                  <td>
                    {(r || scoring) && (
                      <Link href={`/gv/dot/${id}/hs/${st.id}`} className="link text-xs">
                        {r ? (r.status === "APPROVED" ? "Xem →" : "Duyệt →") : "Chấm thay →"}
                      </Link>
                    )}
                  </td>
                  <td className="min-w-40">
                    {r?.feedback?.published && (
                      <ParentNotifyButtons
                        compact
                        feedbackId={r.feedback.id}
                        studentId={st.id}
                        phone={smsPhone(st.parentPhone)}
                        message={parentMessages.get(st.id)!}
                        notifiedAt={r.feedback.parentNotifiedAt ? fmtDateTime(r.feedback.parentNotifiedAt) : null}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-4 font-semibold">Tổng hợp câu trả lời</h2>
          <div className="space-y-5">
            {questions.map((q, qi) => {
              const answered = responses.map((r) => ({ studentId: r.studentId, value: parseAnswers(r.answers)[q.id] ?? "" }));
              if (q.type === "single") {
                return (
                  <div key={q.id}>
                    <div className="mb-2 text-sm font-medium">
                      {qi + 1}. {q.text}
                    </div>
                    <div className="space-y-1.5">
                      {q.options!.map((o) => {
                        const n = answered.filter((a) => a.value === o.id).length;
                        const p = percent(n, responses.length);
                        return (
                          <div key={o.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_4rem]">
                            <span className={o.alert ? "text-amber-800" : ""}>{o.label}</span>
                            <div className="hidden sm:block">
                              <ProgressBar value={p} />
                            </div>
                            <span className="text-right text-slate-600">
                              {n} ({p}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              }
              const texts = answered.filter((a) => a.value.trim());
              return (
                <details key={q.id}>
                  <summary className="cursor-pointer text-sm font-medium">
                    {qi + 1}. {q.text} <span className="font-normal text-slate-500">({texts.length} câu trả lời)</span>
                  </summary>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {texts.map((a) => (
                      <li key={a.studentId} className="rounded-lg bg-slate-50 px-3 py-2">
                        <span className="font-medium">{nameOf.get(a.studentId)}:</span> {a.value}
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </div>
        </div>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Chỉnh sửa đợt</summary>
          <div className="mt-4 space-y-4">
            <EditSurveyForm
              surveyId={id}
              defaults={{ title: survey.title, openAt: toLocalInput(survey.openAt), closeAt: toLocalInput(survey.closeAt) }}
            />
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {status !== "closed" && (
                <form action={closeSurveyNowAction.bind(null, id)}>
                  <SubmitButton className="btn-secondary" confirm="Đóng phiếu ngay bây giờ? Học sinh sẽ không nộp/sửa được nữa.">
                    Đóng phiếu ngay
                  </SubmitButton>
                </form>
              )}
              {(approvedCount === 0 || user.role === "ADMIN") && (
              <form action={deleteSurveyAction.bind(null, id)}>
                <SubmitButton
                  className="btn-danger"
                  confirm={`Xóa đợt "${survey.title}"? Toàn bộ ${responses.length} phiếu đã nộp và nhận xét sẽ bị xóa vĩnh viễn.`}
                >
                  Xóa đợt
                </SubmitButton>
              </form>
              )}
            </div>
          </div>
        </details>
      </div>
    </>
  );
}
