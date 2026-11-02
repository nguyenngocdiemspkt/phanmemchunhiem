import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDate, fmtShortDate } from "@/lib/format";
import { NOTE_TYPE } from "@/lib/notes";
import { Badge, PageHeader } from "@/components/ui";
import { LineChartCard } from "@/components/LineChartCard";
import { FeedbackCard, goalsOf } from "@/components/FeedbackCard";

export default async function JourneyPage() {
  const { student } = await requireStudent();
  const [responses, notes] = await Promise.all([
    prisma.response.findMany({
      where: { studentId: student.id },
      orderBy: { survey: { openAt: "asc" } },
      include: {
        survey: { select: { id: true, title: true, openAt: true } },
        feedback: { include: { teacher: { select: { fullName: true } } } },
      },
    }),
    prisma.note.findMany({
      where: { studentId: student.id, visibleToStudent: true, type: { not: "CONCERN" } },
      orderBy: { date: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Hành trình tiến bộ của em" subtitle={`${responses.length} tuần đã tự đánh giá`} />

      <div className="card">
        <h2 className="mb-1 font-semibold">Mức tự đánh giá qua từng tuần</h2>
        <p className="mb-3 text-xs text-slate-500">Đây không phải điểm xếp loại, mà là cách em tự nhìn nhận bản thân mỗi tuần.</p>
        <LineChartCard
          data={responses.map((r) => ({ label: fmtShortDate(r.survey.openAt), score: r.score }))}
          series={[{ key: "score", name: "Mức tự đánh giá", color: "#0f766e" }]}
          height={220}
        />
      </div>

      {notes.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">🌟 Những điều thầy/cô ghi nhận ở em</h2>
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="text-sm">
                <Badge className={NOTE_TYPE[n.type].style}>{NOTE_TYPE[n.type].label}</Badge>{" "}
                <span className="text-xs text-slate-500">{fmtDate(n.date)}</span>
                <p className="mt-1 whitespace-pre-line">{n.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {[...responses].reverse().map((r) => (
          <div key={r.id} className="card">
            <div className="mb-3 flex items-center justify-between gap-2">
              <Link href={`/hs/phieu/${r.survey.id}`} className="font-semibold text-slate-900 hover:text-teal-700">
                {r.survey.title}
              </Link>
              {r.score != null && <span className="text-sm text-slate-500">{r.score}%</span>}
            </div>
            {r.feedback?.published ? (
              <FeedbackCard
                content={r.feedback.content}
                goals={goalsOf(r.feedback.goals)}
                teacher={r.feedback.teacher?.fullName}
                date={r.feedback.publishedAt}
              />
            ) : (
              <p className="text-sm text-slate-500">Thầy/cô chưa gửi phản hồi cho tuần này.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
