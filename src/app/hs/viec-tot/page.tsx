import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDate, toDateInput } from "@/lib/format";
import { DEED_STATUS } from "@/lib/deeds";
import { byVietnameseName } from "@/lib/students";
import { completeDeedAction, cancelDeedAction } from "@/lib/deedActions";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { CreateDeedForm } from "@/components/deeds/DeedForms";

export default async function StudentDeedsPage() {
  const { student } = await requireStudent();
  const [classmates, mine, received] = await Promise.all([
    prisma.student.findMany({
      where: { classId: student.classId, status: "ACTIVE", NOT: { id: student.id } },
      select: { id: true, user: { select: { fullName: true } } },
    }),
    prisma.goodDeed.findMany({
      where: { authorId: student.id },
      orderBy: { createdAt: "desc" },
      include: { beneficiary: { select: { user: { select: { fullName: true } } } } },
    }),
    prisma.goodDeed.findMany({
      where: { beneficiaryId: student.id, status: { not: "REJECTED" } },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { user: { select: { fullName: true } } } } },
    }),
  ]);
  classmates.sort(byVietnameseName((s) => s.user.fullName));
  const now = new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Việc tốt của em" subtitle="Ghi lại việc tốt hoặc nhận thử thách giúp đỡ bạn. Thầy/cô xác nhận sẽ cộng điểm thi đua và nuôi cây của em." />
      <div className="card">
        <h2 className="mb-3 font-semibold">Tạo phiếu việc tốt</h2>
        <CreateDeedForm classmates={classmates.map((c) => ({ id: c.id, name: c.user.fullName }))} today={toDateInput(now)} />
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Phiếu của em</h2>
        {mine.length === 0 && <Empty>Em chưa có phiếu việc tốt nào.</Empty>}
        {mine.map((d) => (
          <div key={d.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{d.title}</span>
              <Badge className={DEED_STATUS[d.status].style}>{DEED_STATUS[d.status].label}</Badge>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {d.kind === "CHALLENGE" ? `Thử thách, hạn ${fmtDate(d.deadline!)}` : "Một lần"} · tạo {fmtDate(d.createdAt)}
              {d.beneficiary && ` · hỗ trợ ${d.beneficiary.user.fullName}`}
              {d.status === "ONGOING" && d.deadline && d.deadline < now && <span className="text-amber-700"> · đã quá hạn</span>}
            </div>
            {d.description && <p className="mt-2 whitespace-pre-line text-sm">{d.description}</p>}
            {d.status === "APPROVED" && (
              <p className="mt-2 text-sm text-emerald-800">
                Em được +{d.authorPoints ?? 0} điểm
                {d.beneficiary && d.beneficiaryPoints ? `, ${d.beneficiary.user.fullName} được +${d.beneficiaryPoints} điểm` : ""}.
              </p>
            )}
            {d.teacherNote && <p className="mt-1 text-sm text-slate-600">Thầy/cô: {d.teacherNote}</p>}
            {(d.status === "ONGOING" || d.status === "PENDING") && (
              <div className="mt-3 flex gap-2">
                {d.status === "ONGOING" && (
                  <form action={completeDeedAction.bind(null, d.id)}>
                    <SubmitButton className="btn-primary btn-sm">Báo hoàn thành</SubmitButton>
                  </form>
                )}
                <form action={cancelDeedAction.bind(null, d.id)}>
                  <SubmitButton className="btn-secondary btn-sm" confirm="Rút phiếu việc tốt này?">
                    Rút phiếu
                  </SubmitButton>
                </form>
              </div>
            )}
          </div>
        ))}
      </section>

      {received.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Các bạn giúp đỡ em</h2>
          {received.map((d) => (
            <div key={d.id} className="card text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <b>{d.author.user.fullName}</b>: {d.title}
                </span>
                <Badge className={DEED_STATUS[d.status].style}>{DEED_STATUS[d.status].label}</Badge>
              </div>
              {d.status === "APPROVED" && !!d.beneficiaryPoints && <p className="mt-1 text-emerald-800">Em được +{d.beneficiaryPoints} điểm cùng bạn.</p>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
