import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { CreateFeatureRequestForm } from "@/components/FeatureRequestForms";
import { FEATURE_STATUS } from "@/lib/featureRequests";

export default async function StudentFeatureRequestsPage() {
  const { student } = await requireStudent();
  const mine = await prisma.featureRequest.findMany({ where: { studentId: student.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Đề xuất phần mềm" subtitle="Em muốn Class Master có thêm chức năng gì? Hãy gửi ý tưởng cho nhà trường nhé." />
      <div className="card">
        <CreateFeatureRequestForm />
      </div>
      <section className="space-y-3">
        <h2 className="font-semibold">Đề xuất em đã gửi</h2>
        {mine.length === 0 && <Empty>Em chưa gửi đề xuất nào.</Empty>}
        {mine.map((r) => (
          <div key={r.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{r.title}</span>
              <Badge className={FEATURE_STATUS[r.status].style}>{FEATURE_STATUS[r.status].label}</Badge>
            </div>
            <div className="mt-1 text-xs text-slate-500">Gửi ngày {fmtDate(r.createdAt)}</div>
            <p className="mt-2 whitespace-pre-line text-sm">{r.description}</p>
            {r.adminNote && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">Nhà trường: {r.adminNote}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
