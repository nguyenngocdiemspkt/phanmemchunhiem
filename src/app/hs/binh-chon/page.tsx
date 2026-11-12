import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { POLL_STATUS, pollStatus } from "@/lib/polls";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { VoteForm } from "@/components/PollForms";
import { PollResults } from "@/components/PollResults";

/**
 * Bình chọn của lớp. Học sinh chỉ thấy số lượng của từng lựa chọn (không thấy tên bạn khác),
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
  const myVote = new Map(mine.map((v) => [v.pollId, v.optionId]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Bình chọn của lớp" subtitle="Em chọn một phương án; kết quả chỉ hiện số lượng, không hiện tên các bạn." />
      {polls.length === 0 && <Empty>Lớp chưa có bình chọn nào.</Empty>}
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
