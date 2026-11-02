import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { parseQuestions } from "@/lib/questions";
import { Badge, Empty, PageHeader } from "@/components/ui";

export default async function TemplatesPage() {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const templates = await prisma.formTemplate.findMany({
    where: user.role === "ADMIN" ? {} : { OR: [{ isShared: true }, { ownerId: user.id }] },
    orderBy: [{ isShared: "desc" }, { updatedAt: "desc" }],
    include: { owner: { select: { fullName: true } } },
  });

  return (
    <>
      <PageHeader
        title="Mẫu phiếu tự đánh giá"
        subtitle="Thầy/cô tự soạn câu hỏi; mẫu dùng chung do quản trị viên tạo có thể nhân bản để chỉnh sửa."
        actions={
          <Link href="/gv/mau-phieu/moi" className="btn-primary">
            + Tạo mẫu mới
          </Link>
        }
      />
      {templates.length === 0 ? (
        <Empty>Chưa có mẫu phiếu nào.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Link key={t.id} href={`/gv/mau-phieu/${t.id}`} className="card block transition hover:border-teal-400">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900">{t.name}</div>
                {t.isShared && <Badge className="bg-violet-50 text-violet-800 ring-violet-200">Dùng chung</Badge>}
              </div>
              {t.description && <p className="mt-1 text-sm text-slate-500">{t.description}</p>}
              <p className="mt-3 text-xs text-slate-500">
                {parseQuestions(t.questions).length} câu hỏi · {t.owner?.fullName ?? "—"} · cập nhật {fmtDate(t.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
