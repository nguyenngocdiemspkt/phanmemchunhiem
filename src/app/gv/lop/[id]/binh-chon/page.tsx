import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { addDays, fmtDateTime, toLocalInput } from "@/lib/format";
import { POLL_STATUS, pollStatus } from "@/lib/polls";
import { Badge, Empty } from "@/components/ui";
import { CreatePollForm } from "@/components/PollForms";

export default async function ClassPollsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireClassAccess(id);
  const [polls, studentCount] = await Promise.all([
    prisma.poll.findMany({ where: { classId: id }, orderBy: { startAt: "desc" }, include: { _count: { select: { votes: true, options: true } } } }),
    prisma.student.count({ where: { classId: id, status: "ACTIVE" } }),
  ]);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-3 font-semibold">Tạo bình chọn mới</h2>
        <CreatePollForm classId={id} defaults={{ startAt: toLocalInput(now), endAt: toLocalInput(addDays(now, 3)) }} />
      </div>

      {polls.length === 0 ? (
        <Empty>Lớp chưa có bình chọn nào.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Nội dung</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th className="text-right">Đã bình chọn</th>
              </tr>
            </thead>
            <tbody>
              {polls.map((p) => {
                const st = pollStatus(p, now);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/gv/lop/${id}/binh-chon/${p.id}`} className="link">
                        {p.question}
                      </Link>
                      <div className="text-xs text-slate-500">{p._count.options} lựa chọn</div>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-600">
                      {fmtDateTime(p.startAt)} → {fmtDateTime(p.closedAt ?? p.endAt)}
                    </td>
                    <td>
                      <Badge className={POLL_STATUS[st].style}>{p.closedAt ? "Đã đóng sớm" : POLL_STATUS[st].label}</Badge>
                    </td>
                    <td className="text-right tabular-nums">
                      {p._count.votes}/{studentCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
