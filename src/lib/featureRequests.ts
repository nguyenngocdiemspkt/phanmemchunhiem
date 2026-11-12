import type { FeatureRequestStatus } from "@prisma/client";

export const FEATURE_STATUS: Record<FeatureRequestStatus, { label: string; style: string }> = {
  NEW: { label: "Chờ xem xét", style: "bg-sky-50 text-sky-800 ring-sky-200" },
  PLANNED: { label: "Đã đưa vào kế hoạch", style: "bg-violet-50 text-violet-800 ring-violet-200" },
  DONE: { label: "Đã làm", style: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  DECLINED: { label: "Chưa thực hiện", style: "bg-slate-100 text-slate-600 ring-slate-200" },
};
