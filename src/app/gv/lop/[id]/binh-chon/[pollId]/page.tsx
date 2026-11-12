import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { closePollAction, deletePollAction } from "@/lib/pollActions";
import { POLL_STATUS, pollStatus } from "@/lib/polls";
import { byVietnameseName } from "@/lib/students";
import { Badge } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { PollResults } from "@/components/PollResults";

/** GVCN xem chi tiết: ai bình chọn phương án nào, ai chưa bình chọn */
export default async function PollDetailPage({ params }: { params: Promise<{ id: string; pollId: string }> }) {
  const { id, pollId } = await params;
  await requireClassAccess(id);
  const poll = await prisma.poll.findFirst({
    where: { id: pollId, classId: id },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      votes: { include: { student: { select: { id: true, user: { select: { fullName: true } } } } } },
    },
  });
  if (!poll) notFound();
  const students = await prisma.student.findMany({ where: { classId: id, status: "ACTIVE" }, select: { id: true, user: { select: { fullName: true } } } });
  students.sort(byVietnameseName((s) => s.user.fullName));
  const st = pollStatus(poll);
  const names = new Map<string, string[]>();
  for (const v of poll.votes) names.set(v.optionId, [...(names.get(v.optionId) ?? []), v.student.user.fullName]);
  for (const [k, list] of names) names.set(k, list.sort((a, b) => a.localeCompare(b, "vi")));
  const voted = new Set(poll.votes.map((v) => v.student.id));
  const notVoted = students.filter((s) => !voted.has(s.id));

  return (
    <div className="space-y-6">
      <Link href={`/gv/lop/${id}/binh-chon`} className="text-sm text-slate-500 hover:text-teal-700">
        ← Các bình chọn của lớp
      </Link>
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">{poll.question}</h2>
            {poll.description && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{poll.description}</p>}
            <p className="mt-1 text-xs text-slate-500">
              {fmtDateTime(poll.startAt)} → {fmtDateTime(poll.endAt)}
              {poll.closedAt && ` · đóng sớm lúc ${fmtDateTime(poll.closedAt)}`}
            </p>
          </div>
          <Badge className={POLL_STATUS[st].style}>{poll.closedAt ? "Đã đóng sớm" : POLL_STATUS[st].label}</Badge>
        </div>
        <div className="mt-4">
          <PollResults
            options={poll.options.map((o) => ({ id: o.id, text: o.text, count: names.get(o.id)?.length ?? 0 }))}
            total={poll.votes.length}
            names={names}
          />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Đã bình chọn {poll.votes.length}/{students.length}.
          {notVoted.length > 0 && <span> Chưa bình chọn: {notVoted.map((s) => s.user.fullName).join(", ")}.</span>}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {st !== "closed" && (
            <form action={closePollAction.bind(null, poll.id)}>
              <SubmitButton className="btn-secondary" confirm="Đóng bình chọn ngay bây giờ? Học sinh sẽ không bình chọn được nữa.">
                Đóng bình chọn ngay
              </SubmitButton>
            </form>
          )}
          <form action={deletePollAction.bind(null, poll.id)}>
            <SubmitButton className="btn-danger" confirm={`Xóa bình chọn "${poll.question}" và ${poll.votes.length} lượt bình chọn?`}>
              Xóa bình chọn
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
