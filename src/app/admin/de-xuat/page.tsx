import Link from "next/link";
import type { FeatureRequestStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { UpdateFeatureRequestForm } from "@/components/FeatureRequestForms";
import { FEATURE_STATUS } from "@/lib/featureRequests";

/** Danh sách đề xuất chức năng của học sinh (chỉ quản trị) */
export default async function AdminFeatureRequestsPage({ searchParams }: { searchParams: Promise<{ tt?: string }> }) {
  await requireUser(["ADMIN"]);
  const { tt } = await searchParams;
  const status = tt && tt in FEATURE_STATUS ? (tt as FeatureRequestStatus) : undefined;
  const [requests, counts] = await Promise.all([
    prisma.featureRequest.findMany({ where: status ? { status } : undefined, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.featureRequest.groupBy({ by: ["status"], _count: true }),
  ]);
  const count = (s: FeatureRequestStatus) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((n, c) => n + c._count, 0);

  return (
    <>
      <PageHeader title="Đề xuất chức năng của học sinh" subtitle={`${total} đề xuất · ${count("NEW")} chờ xem xét`} />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/admin/de-xuat" className={`rounded-lg px-3 py-1 ${!status ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}>
          Tất cả ({total})
        </Link>
        {(Object.keys(FEATURE_STATUS) as FeatureRequestStatus[]).map((s) => (
          <Link
            key={s}
            href={`/admin/de-xuat?tt=${s}`}
            className={`rounded-lg px-3 py-1 ${status === s ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {FEATURE_STATUS[s].label} ({count(s)})
          </Link>
        ))}
      </div>
      {requests.length === 0 ? (
        <Empty>Chưa có đề xuất nào.</Empty>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{r.title}</span>
                <Badge className={FEATURE_STATUS[r.status].style}>{FEATURE_STATUS[r.status].label}</Badge>
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {r.authorName} · lớp {r.className} · {fmtDateTime(r.createdAt)}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm">{r.description}</p>
              <UpdateFeatureRequestForm id={r.id} status={r.status} adminNote={r.adminNote} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
