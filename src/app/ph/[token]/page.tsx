import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDate, fmtShortDate } from "@/lib/format";
import { findOption, parseAnswers, parseQuestions } from "@/lib/questions";
import { FeedbackCard, goalsOf } from "@/components/FeedbackCard";
import { LineChartCard } from "@/components/LineChartCard";

// Trang riêng tư theo đường link: không cho công cụ tìm kiếm lưu, không gửi link sang trang khác
export const metadata: Metadata = {
  title: "Kết quả tự đánh giá của con",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const SHOW_LAST = 10;

/** Phụ huynh xem kết quả tự đánh giá và nhận xét của giáo viên (chỉ các phiếu giáo viên đã gửi nhận xét). */
export default async function ParentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const student = await prisma.student.findUnique({
    where: { parentToken: token },
    include: {
      user: { select: { fullName: true } },
      classroom: { include: { homeroomTeacher: { select: { fullName: true, phone: true } } } },
    },
  });
  if (!student) notFound();

  const [responses, notes] = await Promise.all([
    prisma.response.findMany({
      where: { studentId: student.id, feedback: { published: true } },
      orderBy: { survey: { openAt: "desc" } },
      take: SHOW_LAST,
      include: {
        survey: { select: { title: true, openAt: true, questions: true } },
        feedback: { include: { teacher: { select: { fullName: true } } } },
      },
    }),
    prisma.note.findMany({
      where: { studentId: student.id, visibleToStudent: true, type: { not: "CONCERN" } },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);
  const teacher = student.classroom.homeroomTeacher;
  const chart = [...responses]
    .reverse()
    .filter((r) => r.score != null)
    .map((r) => ({ label: fmtShortDate(r.survey.openAt), score: r.score }));

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <div className="text-sm font-bold text-teal-800">Sổ chủ nhiệm · Dành cho phụ huynh</div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{student.user.fullName}</h1>
          <p className="text-sm text-slate-500">
            Lớp {student.classroom.name} · Năm học {student.classroom.schoolYear}
            {teacher ? ` · GVCN ${teacher.fullName}` : ""}
            {teacher?.phone ? ` (${teacher.phone})` : ""}
          </p>
        </div>

        {responses.length === 0 ? (
          <p className="card text-sm text-slate-500">Chưa có phiếu tự đánh giá nào được giáo viên nhận xét.</p>
        ) : (
          <>
            {chart.length >= 2 && (
              <div className="card">
                <h2 className="mb-3 font-semibold">Mức tự đánh giá qua các tuần</h2>
                <LineChartCard data={chart} series={[{ key: "score", name: "Mức tự đánh giá", color: "#0f766e" }]} height={200} />
              </div>
            )}

            {responses.map((r, i) => {
              const questions = parseQuestions(r.survey.questions);
              const answers = parseAnswers(r.answers);
              return (
                <details key={r.id} className="card" open={i === 0}>
                  <summary className="cursor-pointer">
                    <span className="font-semibold">{r.survey.title}</span>
                    <span className="ml-2 text-sm text-slate-500">
                      {fmtDate(r.survey.openAt)}
                      {r.score != null ? ` · tự đánh giá ${r.score}%` : ""}
                    </span>
                  </summary>
                  <div className="mt-4 space-y-4">
                    <FeedbackCard
                      title="Nhận xét của giáo viên chủ nhiệm"
                      content={r.feedback!.content}
                      goals={goalsOf(r.feedback!.goals)}
                      teacher={r.feedback!.teacher?.fullName}
                      date={r.feedback!.publishedAt}
                      goalTitle="🎯 Mục tiêu tuần tới của con"
                    />
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-slate-700">Con tự đánh giá</h3>
                      <ol className="space-y-3">
                        {questions.map((q, qi) => {
                          const opt = findOption(q, answers);
                          const value = q.type === "single" ? opt?.label : answers[q.id]?.trim();
                          return (
                            <li key={q.id} className="text-sm">
                              <div className="text-slate-600">
                                {qi + 1}. {q.text}
                              </div>
                              <div className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-slate-800">
                                {value || <i className="text-slate-400">Không trả lời</i>}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                  </div>
                </details>
              );
            })}
          </>
        )}

        {notes.length > 0 && (
          <div className="card">
            <h2 className="mb-3 font-semibold">🌟 Ghi nhận của giáo viên</h2>
            <ul className="space-y-2 text-sm">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg bg-emerald-50 px-3 py-2">
                  <span className="text-xs text-slate-500">{fmtDate(n.date)} · </span>
                  {n.content}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">
          Đường link này dành riêng cho phụ huynh em {student.user.fullName}, xin vui lòng không chia sẻ cho người khác.
        </p>
      </main>
    </div>
  );
}
