import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDateTime, percent, surveyStatus, toLocalInput } from "@/lib/format";
import { parseAnswers, parseQuestions } from "@/lib/questions";
import { flagRank, studentFlags } from "@/lib/insights";
import { Badge, FlagList, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { EditSurveyForm } from "../SurveyForms";
import { closeSurveyNowAction, deleteSurveyAction } from "../actions";

export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const survey = await prisma.survey.findUnique({ where: { id }, include: { classroom: true } });
  if (!survey) notFound();
  await requireClassAccess(survey.classId);

  const [students, responses, prevSurvey] = await Promise.all([
    prisma.student.findMany({
      where: { classId: survey.classId, OR: [{ user: { active: true } }, { responses: { some: { surveyId: id } } }] },
      include: { user: { select: { fullName: true } } },
    }),
    prisma.response.findMany({ where: { surveyId: id }, include: { feedback: true } }),
    prisma.survey.findFirst({
      where: { classId: survey.classId, openAt: { lt: survey.openAt } },
      orderBy: { openAt: "desc" },
      select: { responses: { select: { studentId: true, score: true, urgent: true, answers: true } } },
    }),
  ]);

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
            Đã nộp <b>{responses.length}</b>/{students.length} ({rate}%) · Đã gửi nhận xét{" "}
            <b>{responses.filter((r) => r.feedback?.published).length}</b>
          </div>
        </div>

        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Học sinh</th>
                <th>Nộp lúc</th>
                <th>Mức tự đánh giá</th>
                <th>Dấu hiệu</th>
                <th>Nhận xét</th>
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
                  <td>{r?.score != null ? `${r.score}%` : "—"}</td>
                  <td className="max-w-xs">
                    <FlagList flags={flags} />
                  </td>
                  <td>
                    {r && (
                      <Link href={`/gv/dot/${id}/hs/${st.id}`} className="inline-flex items-center gap-2">
                        {r.feedback?.published ? (
                          <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-200">Đã gửi</Badge>
                        ) : r.feedback ? (
                          <Badge className="bg-amber-50 text-amber-800 ring-amber-200">Bản nháp</Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Chưa nhận xét</Badge>
                        )}
                        <span className="link text-xs">Xem →</span>
                      </Link>
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
              <form action={deleteSurveyAction.bind(null, id)}>
                <SubmitButton
                  className="btn-danger"
                  confirm={`Xóa đợt "${survey.title}"? Toàn bộ ${responses.length} phiếu đã nộp và nhận xét sẽ bị xóa vĩnh viễn.`}
                >
                  Xóa đợt
                </SubmitButton>
              </form>
            </div>
          </div>
        </details>
      </div>
    </>
  );
}
