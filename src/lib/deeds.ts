import type { GoodDeedStatus } from "@prisma/client";

export const DEED_STATUS: Record<GoodDeedStatus, { label: string; style: string }> = {
  ONGOING: { label: "Đang thực hiện", style: "bg-sky-50 text-sky-800 ring-sky-200" },
  PENDING: { label: "Chờ thầy/cô duyệt", style: "bg-amber-50 text-amber-800 ring-amber-200" },
  APPROVED: { label: "Đã duyệt", style: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  REJECTED: { label: "Không được duyệt", style: "bg-slate-100 text-slate-600 ring-slate-200" },
};
