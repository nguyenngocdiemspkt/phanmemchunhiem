import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDateTime, fmtShortDate, percent, surveyStatus } from "@/lib/format";
import { flagRank, studentFlags, type Flag } from "@/lib/insights";
import { Empty, FlagList, ProgressBar, Stat, StatusBadge } from "@/components/ui";
import { LineChartCard } from "@/components/LineChartCard";

export default async function ClassOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireClassAccess(id);
  const now = new Date();

  const [students, recentSurveys] = await Promise.all([
    prisma.student.findMany({
      where: { classId: id, user: { active: true } },
      include: { user: { select: { fullName: true } } },
      orderBy: { user: { fullName: "asc" } },
    }),
    prisma.survey.findMany({
      where: { classId: id, openAt: { lte: now } },
      orderBy: { openAt: "desc" },
      take: 12,
      include: {
        responses: {
          select: { studentId: true, score: true, urgent: true, answers: true, feedback: { select: { published: true } } },
        },
      },
    }),
  ]);
  const surveys = recentSurveys.reverse();
  const latest = surveys.at(-1);
  const previous = surveys.at(-2);

  if (!latest) {
    return (
      <Empty>
        Lớp chưa có đợt tự đánh giá nào.{" "}
        <Link href={`/gv/lop/${id}/dot`} className="link">
          Tạo đợt đầu tiên
        </Link>
      </Empty>
    );
  }

  const byStudent = (s: (typeof surveys)[number]) => new Map(s.responses.map((r) => [r.studentId, r]));
  const latestMap = byStudent(latest);
  const prevMap = previous ? byStudent(previous) : new Map();
  const closedDesc = surveys.filter((s) => surveyStatus(s, now) === "closed").reverse().map(byStudent);

  const attention: { student: (typeof students)[number]; flags: Flag[] }[] = [];
  const missing: (typeof students)[number][] = [];
  for (const st of students) {
    let missedStreak = 0;
    for (const m of closedDesc) {
      if (m.has(st.id)) break;
      missedStreak++;
    }
    const current = latestMap.get(st.id);
    if (!current) missing.push(st);
    const flags = studentFlags({ questions: latest.questions, current, previous: prevMap.get(st.id), missedStreak });
    if (flags.length) attention.push({ student: st, flags });
  }
  attention.sort((a, b) => flagRank(b.flags) - flagRank(a.flags));

  const submitted = latestMap.size;
  const rate = percent(submitted, students.length);
  const pendingFeedback = latest.responses.filter((r) => !r.feedback?.published).length;
  const urgentCount = latest.responses.filter((r) => r.urgent).length;

  const chartData = surveys.map((s) => {
    const scores = s.responses.map((r) => r.score).filter((x): x is number => x != null);
    return {
      label: fmtShortDate(s.openAt),
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      rate: percent(s.responses.length, students.length),
    };
  });

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm text-slate-500">Đợt gần nhất</div>
            <Link href={`/gv/dot/${latest.id}`} className="text-lg font-semibold text-slate-900 hover:text-teal-700">
              {latest.title}
            </Link>
          </div>
          <div className="text-right text-sm text-slate-500">
            <StatusBadge status={surveyStatus(latest, now)} />
            <div className="mt-1">Đóng lúc {fmtDateTime(latest.closeAt)}</div>
          </div>
        </div>
        <ProgressBar value={rate} />
        <div className="mt-1 text-sm text-slate-600">
          Đã nộp <b>{submitted}</b>/{students.length} học sinh ({rate}%)
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tỷ lệ hoàn thành" value={`${rate}%`} />
        <Stat label="Chưa nộp" value={missing.length} />
        <Stat label="Cần quan tâm" value={attention.length} hint={urgentCount ? <span className="text-red-700">{urgentCount} khẩn</span> : undefined} />
        <Stat
          label="Chờ nhận xét"
          value={pendingFeedback}
          hint={
            <Link href={`/gv/dot/${latest.id}`} className="link">
              Nhận xét ngay →
            </Link>
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold">Học sinh cần quan tâm</h2>
          {attention.length === 0 ? (
            <p className="text-sm text-slate-500">Không có dấu hiệu đáng lo ngại ở đợt này.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {attention.map(({ student, flags }) => (
                <li key={student.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
                  <Link href={`/gv/hoc-sinh/${student.id}`} className="link">
                    {student.user.fullName}
                  </Link>
                  <div className="max-w-[70%]">
                    <FlagList flags={flags} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Chưa nộp phiếu ({missing.length})</h2>
          {missing.length === 0 ? (
            <p className="text-sm text-slate-500">Tất cả học sinh đã nộp.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {missing.map((s) => (
                <Link
                  key={s.id}
                  href={`/gv/hoc-sinh/${s.id}`}
                  className="rounded-lg bg-slate-100 px-2 py-1 text-sm text-slate-700 hover:bg-slate-200"
                >
                  {s.user.fullName}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="mb-1 font-semibold">Diễn biến của lớp qua các đợt</h2>
        <p className="mb-3 text-xs text-slate-500">Mức tự đánh giá trung bình (0–100) và tỷ lệ nộp phiếu</p>
        <LineChartCard
          data={chartData}
          series={[
            { key: "avg", name: "Mức tự đánh giá TB", color: "#0f766e" },
            { key: "rate", name: "Tỷ lệ nộp (%)", color: "#94a3b8" },
          ]}
        />
      </div>
    </div>
  );
}
