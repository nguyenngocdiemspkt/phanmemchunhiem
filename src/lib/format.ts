// Mọi thời gian lưu dạng UTC, hiển thị và nhập theo giờ Việt Nam.
const TZ = "Asia/Ho_Chi_Minh";
const TZ_OFFSET_MS = 7 * 60 * 60 * 1000;

export function fmtDateTime(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function fmtShortDate(d: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(d);
}

/** Date -> giá trị cho <input type="datetime-local"> theo giờ VN */
export function toLocalInput(d: Date) {
  return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 16);
}

/** Giá trị <input type="datetime-local"> (giờ VN) -> Date, null nếu không hợp lệ */
export function fromLocalInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const d = new Date(`${value}:00+07:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Date -> "YYYY-MM-DD" theo giờ VN, cho <input type="date"> */
export function toDateInput(d: Date) {
  return toLocalInput(d).slice(0, 10);
}

export function fromDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00+07:00`);
  return isNaN(d.getTime()) ? null : d;
}

export type SurveyStatus = "upcoming" | "open" | "closed";

export function surveyStatus(s: { openAt: Date; closeAt: Date }, now = new Date()): SurveyStatus {
  if (now < s.openAt) return "upcoming";
  if (now > s.closeAt) return "closed";
  return "open";
}

export const STATUS_LABEL: Record<SurveyStatus, string> = {
  upcoming: "Chưa mở",
  open: "Đang mở",
  closed: "Đã đóng",
};

export function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

/** Bỏ dấu tiếng Việt, chữ thường */
export function removeDiacritics(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
