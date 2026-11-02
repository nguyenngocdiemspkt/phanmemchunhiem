import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDateTime, surveyStatus } from "@/lib/format";
import { Badge, StatusBadge } from "@/components/ui";
import { FeedbackCard, goalsOf } from "@/components/FeedbackCard";

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ "da-nop"?: string }> }) {
  const { user, student } = await requireStudent();
  const justSubmitted = (await searchParams)["da-nop"] === "1";
  const now = new Date();

  const [surveys, latestFeedback] = await Promise.all([
    prisma.survey.findMany({
      where: { classId: student.classId, closeAt: { gte: now } },
      orderBy: { closeAt: "asc" },
      select: { id: true, title: true, openAt: true, closeAt: true, responses: { where: { studentId: student.id }, select: { id: true } } },
    }),
    prisma.feedback.findFirst({
      where: { published: true, response: { studentId: student.id } },
      orderBy: { publishedAt: "desc" },
      include: { response: { select: { survey: { select: { title: true } } } }, teacher: { select: { fullName: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Chào {user.fullName.split(" ").at(-1)}! 👋</h1>
        <p className="text-sm text-slate-500">Lớp {student.classroom.name}</p>
      </div>

      {justSubmitted && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Em đã gửi phiếu tự đánh giá thành công. Thầy/cô sẽ đọc và phản hồi cho em sớm nhé!
        </p>
      )}

      <section className="card">
        <h2 className="mb-3 font-semibold">Phiếu tự đánh giá</h2>
        {surveys.length === 0 ? (
          <p className="text-sm text-slate-500">Hiện chưa có phiếu nào cần làm.</p>
        ) : (
          <ul className="space-y-3">
            {surveys.map((s) => {
              const status = surveyStatus(s, now);
              const done = s.responses.length > 0;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-slate-500">
                      {status === "upcoming" ? `Mở lúc ${fmtDateTime(s.openAt)}` : `Hạn nộp ${fmtDateTime(s.closeAt)}`}
                    </div>
                  </div>
                  {status === "open" ? (
                    <div className="flex items-center gap-2">
                      {done && <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-200">Đã nộp</Badge>}
                      <Link href={`/hs/phieu/${s.id}`} className={done ? "btn-secondary btn-sm" : "btn-primary"}>
                        {done ? "Xem / sửa" : "Làm phiếu"}
                      </Link>
                    </div>
                  ) : (
                    <StatusBadge status={status} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Phản hồi mới nhất từ thầy/cô</h2>
        {latestFeedback ? (
          <FeedbackCard
            title={latestFeedback.response.survey.title}
            content={latestFeedback.content}
            goals={goalsOf(latestFeedback.goals)}
            teacher={latestFeedback.teacher?.fullName}
            date={latestFeedback.publishedAt}
          />
        ) : (
          <p className="card text-sm text-slate-500">Chưa có phản hồi nào.</p>
        )}
        <div className="mt-3 text-right">
          <Link href="/hs/hanh-trinh" className="link text-sm">
            Xem hành trình tiến bộ của em →
          </Link>
        </div>
      </section>
    </div>
  );
}
