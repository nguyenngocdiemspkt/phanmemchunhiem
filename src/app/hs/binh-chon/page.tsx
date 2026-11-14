import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { POLL_STATUS, pollStatus } from "@/lib/polls";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { VoteForm } from "@/components/PollForms";
import { PollResults } from "@/components/PollResults";
import { CommendationVoteForm } from "@/components/CommendationForms";
import { CommendationBoard } from "@/components/CommendationBoard";
import { loadCommendations, weekLabel } from "@/lib/commendation";

/**
 * Bình chọn tuyên dương: mỗi tuần em bầu 1 bạn; bảng vàng tuần/tháng/học kỳ.
 * Các bình chọn khác: học sinh chỉ thấy số lượng của từng lựa chọn (không thấy tên bạn khác),
 * và chỉ thấy kết quả sau khi em đã bình chọn hoặc khi bình chọn đã đóng.
 */
export default async function StudentPollsPage() {
  const { student } = await requireStudent();
  const now = new Date();
  const polls = await prisma.poll.findMany({
    where: { classId: student.classId, startAt: { lte: now } },
    orderBy: { startAt: "desc" },
    include: { options: { orderBy: { sortOrder: "asc" } } },
  });
  const [counts, mine] = await Promise.all([
    prisma.pollVote.groupBy({ by: ["optionId"], where: { pollId: { in: polls.map((p) => p.id) } }, _count: true }),
    prisma.pollVote.findMany({ where: { studentId: student.id, pollId: { in: polls.map((p) => p.id) } }, select: { pollId: true, optionId: true } }),
  ]);
  const countOf = new Map(counts.map((c) => [c.optionId, c._count]));

  // Tuyên dương
  const year = await prisma.schoolYear.findUnique({ where: { name: student.classroom.schoolYear } });
  const commend = await loadCommendations(student.classId, year, now);
  const [classmates, myCommend] = await Promise.all([
    prisma.student.findMany({
      where: { classId: student.classId, status: "ACTIVE", NOT: { id: student.id } },
      select: { id: true, user: { select: { fullName: true } } },
    }),
    prisma.commendationVote.findUnique({
      where: { voterId_weekStart: { voterId: student.id, weekStart: commend.currentWeek } },
      select: { nomineeId: true, reason: true, nominee: { select: { user: { select: { fullName: true } } } } },
    }),
  ]);
  classmates.sort((a, b) => a.user.fullName.split(" ").at(-1)!.localeCompare(b.user.fullName.split(" ").at(-1)!, "vi") || a.user.fullName.localeCompare(b.user.fullName, "vi"));
  // Lời khen (ẩn danh) dành cho bạn được tuyên dương tuần gần nhất
  const lastWeek = commend.weeks.find((w) => w.done);
  const praises = lastWeek?.winners.length
    ? await prisma.commendationVote.findMany({
        where: { classId: student.classId, weekStart: lastWeek.start, nomineeId: { in: lastWeek.winners.map((w) => w.studentId) }, reason: { not: null } },
        select: { nomineeId: true, reason: true },
        take: 30,
      })
    : [];
  const myVote = new Map(mine.map((v) => [v.pollId, v.optionId]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Bình chọn tuyên dương" subtitle="Mỗi tuần em bầu một bạn xứng đáng được tuyên dương. Các bạn không biết em bầu cho ai." />
      <div className="card" data-testid="commend-week">
        <h2 className="font-semibold">Tuyên dương tuần này ({weekLabel(commend.currentWeek)})</h2>
        <p className="mb-3 text-xs text-slate-500">
          Em bầu 1 bạn (không tự bầu cho mình), đổi được đến hết Chủ nhật. Bạn nhiều phiếu nhất được tuyên dương tuần; tuyên dương tháng và học kỳ
          tính từ số lần được tuyên dương tuần.
        </p>
        {myCommend && (
          <p className="mb-3 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
            Em đã bầu cho <b>{myCommend.nominee.user.fullName}</b>
            {myCommend.reason ? `: “${myCommend.reason}”` : ""}.
          </p>
        )}
        <CommendationVoteForm
          classmates={classmates.map((c) => ({ id: c.id, name: c.user.fullName }))}
          current={myCommend ? { nomineeId: myCommend.nomineeId, reason: myCommend.reason } : null}
        />
      </div>
      {lastWeek && lastWeek.winners.length > 0 && (
        <div className="card border-amber-200 bg-amber-50/60">
          <h2 className="font-semibold">
            🎉 Tuyên dương tuần {lastWeek.label}:{" "}
            {lastWeek.winners.map((w) => (w.studentId === student.id ? `${w.name} (em)` : w.name)).join(", ")}
          </h2>
          {praises.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {praises.map((p, i) => (
                <li key={i}>
                  💬 “{p.reason}”{lastWeek.winners.length > 1 ? <span className="text-xs text-slate-500"> — gửi {lastWeek.winners.find((w) => w.studentId === p.nomineeId)?.name}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <CommendationBoard data={commend} meId={student.id} />

      <h2 className="pt-2 text-lg font-semibold">Bình chọn khác của lớp</h2>
      {polls.length === 0 && <Empty>Lớp chưa có bình chọn nào khác.</Empty>}
      {polls.map((p) => {
        const st = pollStatus(p, now);
        const current = myVote.get(p.id) ?? null;
        const options = p.options.map((o) => ({ id: o.id, text: o.text, count: countOf.get(o.id) ?? 0 }));
        const total = options.reduce((s, o) => s + o.count, 0);
        return (
          <div key={p.id} className="card" data-testid="poll">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{p.question}</h2>
                {p.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{p.description}</p>}
                <p className="mt-1 text-xs text-slate-500">{st === "open" ? `Hạn bình chọn: ${fmtDateTime(p.endAt)}` : `Đã đóng · ${total} phiếu`}</p>
              </div>
              <Badge className={POLL_STATUS[st].style}>{POLL_STATUS[st].label}</Badge>
            </div>
            <div className="mt-4 space-y-4">
              {st === "open" && <VoteForm pollId={p.id} options={p.options} current={current} />}
              {(current || st === "closed") && (
                <div>
                  <div className="mb-2 text-sm font-medium">Kết quả ({total} phiếu)</div>
                  <PollResults options={options} total={total} mine={current} />
                </div>
              )}
              {st === "open" && !current && <p className="text-xs text-slate-500">Em bình chọn xong sẽ thấy kết quả.</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
