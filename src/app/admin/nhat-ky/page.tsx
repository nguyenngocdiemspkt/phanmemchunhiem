import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AUDIT_GROUPS } from "@/lib/audit";
import { fmtDateTime } from "@/lib/format";
import { Empty, PageHeader } from "@/components/ui";

const PAGE_SIZE = 100;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ nhom?: string; q?: string; lop?: string; trang?: string }>;
}) {
  await requireUser(["ADMIN"]);
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.trang) || 1);
  const q = sp.q?.trim();
  const where: Prisma.AuditLogWhereInput = {
    ...(sp.nhom && AUDIT_GROUPS[sp.nhom] ? { action: { startsWith: `${sp.nhom}.` } } : {}),
    ...(sp.lop ? { classId: sp.lop } : {}),
    ...(q
      ? {
          OR: [
            { summary: { contains: q, mode: "insensitive" } },
            { actorName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const [logs, total, classes] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.auditLog.count({ where }),
    prisma.classroom.findMany({ orderBy: [{ schoolYear: "desc" }, { name: "asc" }], select: { id: true, name: true, schoolYear: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams(Object.entries({ ...sp, trang: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/admin/nhat-ky?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Nhật ký thao tác"
        subtitle="Lưu vết các thao tác quan trọng để kiểm tra, đối chiếu. Nhật ký không sửa hay xóa được từ giao diện."
      />

      <form className="card mb-4 flex flex-wrap items-end gap-2">
        <div>
          <label className="label">Nhóm</label>
          <select name="nhom" defaultValue={sp.nhom ?? ""} className="input">
            <option value="">Tất cả</option>
            {Object.entries(AUDIT_GROUPS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Lớp</label>
          <select name="lop" defaultValue={sp.lop ?? ""} className="input">
            <option value="">Tất cả</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.schoolYear})
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-56 flex-1">
          <label className="label">Tìm</label>
          <input name="q" defaultValue={q ?? ""} className="input" placeholder="Tên người thao tác, tên học sinh, nội dung..." />
        </div>
        <button className="btn-secondary">Lọc</button>
      </form>

      {logs.length === 0 ? (
        <Empty>Chưa có thao tác nào.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th className="w-40">Thời gian</th>
                <th className="w-44">Người thao tác</th>
                <th>Nội dung</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="whitespace-nowrap text-xs text-slate-600">{fmtDateTime(l.createdAt)}</td>
                  <td className="text-sm">{l.actorName ?? <span className="text-slate-400">(không đăng nhập)</span>}</td>
                  <td>
                    <div className="text-sm">{l.summary}</div>
                    <div className="font-mono text-[11px] text-slate-400">{l.action}</div>
                    {l.detail != null && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-slate-500">Chi tiết</summary>
                        <pre className="mt-1 max-h-64 overflow-auto rounded bg-slate-50 p-2 text-[11px]">{JSON.stringify(l.detail, null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="btn-secondary btn-sm">
              ← Trang trước
            </Link>
          )}
          <span className="text-slate-500">
            Trang {page}/{pages} · {total} dòng
          </span>
          {page < pages && (
            <Link href={pageHref(page + 1)} className="btn-secondary btn-sm">
              Trang sau →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
