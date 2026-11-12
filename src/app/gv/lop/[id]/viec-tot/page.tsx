import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { DEED_STATUS } from "@/lib/deeds";
import { Badge, Empty } from "@/components/ui";
import { ReviewDeedForm } from "@/components/deeds/DeedForms";

export default async function ClassDeedsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireClassAccess(id);
  const deeds = await prisma.goodDeed.findMany({
    where: { classId: id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      author: { select: { user: { select: { fullName: true } } } },
      beneficiary: { select: { user: { select: { fullName: true } } } },
    },
  });
  const open = deeds.filter((d) => d.status === "PENDING" || d.status === "ONGOING");
  // Chờ duyệt lên trước thử thách đang làm
  open.sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING"));
  const done = deeds.filter((d) => d.status === "APPROVED" || d.status === "REJECTED");
  const now = new Date();

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-semibold">
          Cần xử lý ({open.filter((d) => d.status === "PENDING").length} chờ duyệt, {open.filter((d) => d.status === "ONGOING").length} thử thách đang
          thực hiện)
        </h2>
        {open.length === 0 && <Empty>Không có phiếu việc tốt nào cần xử lý.</Empty>}
        {open.map((d) => (
          <div key={d.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <b>{d.author.user.fullName}</b>: {d.title}
              </span>
              <Badge className={DEED_STATUS[d.status].style}>{DEED_STATUS[d.status].label}</Badge>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {d.kind === "CHALLENGE" ? `Thử thách, hạn ${fmtDate(d.deadline!)}` : "Một lần"} · tạo {fmtDateTime(d.createdAt)}
              {d.beneficiary && ` · hỗ trợ ${d.beneficiary.user.fullName}`}
              {d.completedAt && ` · báo hoàn thành ${fmtDateTime(d.completedAt)}`}
              {d.status === "ONGOING" && d.deadline && d.deadline < now && <span className="text-amber-700"> · đã quá hạn</span>}
            </div>
            {d.description && <p className="mt-2 whitespace-pre-line text-sm">{d.description}</p>}
            <ReviewDeedForm deedId={d.id} beneficiaryName={d.beneficiary?.user.fullName ?? null} />
          </div>
        ))}
      </section>

      {done.length > 0 && (
        <section className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Ngày duyệt</th>
                <th>Học sinh</th>
                <th>Việc tốt</th>
                <th>Điểm</th>
              </tr>
            </thead>
            <tbody>
              {done.map((d) => (
                <tr key={d.id} className={d.status === "REJECTED" ? "opacity-60" : ""}>
                  <td className="whitespace-nowrap text-xs">{d.reviewedAt ? fmtDate(d.reviewedAt) : ""}</td>
                  <td>{d.author.user.fullName}</td>
                  <td>
                    {d.title}
                    {d.beneficiary && <div className="text-xs text-slate-500">hỗ trợ {d.beneficiary.user.fullName}</div>}
                  </td>
                  <td className="whitespace-nowrap text-sm">
                    {d.status === "APPROVED" ? (
                      <>
                        +{d.authorPoints}
                        {d.beneficiary && d.beneficiaryPoints ? ` / +${d.beneficiaryPoints}` : ""}
                      </>
                    ) : (
                      <Badge className={DEED_STATUS.REJECTED.style}>{DEED_STATUS.REJECTED.label}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
