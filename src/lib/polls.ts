export type PollStatus = "upcoming" | "open" | "closed";

/** Trạng thái cuộc bình chọn: chưa mở, đang mở, đã đóng (hết giờ hoặc GV đóng sớm) */
export function pollStatus(p: { startAt: Date; endAt: Date; closedAt: Date | null }, now = new Date()): PollStatus {
  if (p.closedAt || now >= p.endAt) return "closed";
  if (now < p.startAt) return "upcoming";
  return "open";
}

export const POLL_STATUS: Record<PollStatus, { label: string; style: string }> = {
  upcoming: { label: "Chưa mở", style: "bg-slate-100 text-slate-700 ring-slate-200" },
  open: { label: "Đang mở", style: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
  closed: { label: "Đã đóng", style: "bg-slate-100 text-slate-500 ring-slate-200" },
};

export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 10;
