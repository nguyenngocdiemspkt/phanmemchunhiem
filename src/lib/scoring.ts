// Chấm điểm thi đua cá nhân theo tiêu chí. Dùng chung cho client và server (không import Prisma ở đây).

/** Tiêu chí trong bản chụp của đợt: điểm cho mỗi lần (dương = cộng, âm = trừ) */
export type Criterion = { id: string; name: string; points: number };
export type Counts = Record<string, number>;

export const MAX_TIMES = 50;

export function parseCriteria(raw: unknown): Criterion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c) => {
      const r = (c ?? {}) as Record<string, unknown>;
      return { id: String(r.id ?? ""), name: String(r.name ?? "").trim(), points: Number(r.points) };
    })
    .filter((c) => c.id && c.name && Number.isInteger(c.points));
}

export function parseCounts(raw: unknown): Counts {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Counts = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0) out[k] = Math.min(n, MAX_TIMES);
  }
  return out;
}

/** Đọc số lần từ form (ô tên `${prefix}<id>`), chỉ giữ tiêu chí có trong đợt */
export function countsFromForm(criteria: Criterion[], formData: FormData, prefix: string): { counts: Counts } | { error: string } {
  const out: Counts = {};
  for (const c of criteria) {
    const raw = String(formData.get(`${prefix}${c.id}`) ?? "").trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > MAX_TIMES) return { error: `"${c.name}": số lần phải là số nguyên từ 0 đến ${MAX_TIMES}.` };
    if (n > 0) out[c.id] = n;
  }
  return { counts: out };
}

/**
 * Số lần được tính của từng tiêu chí: GV đã chốt thì lấy số GV chốt,
 * nếu không thì lấy học sinh tự khai + các bổ sung của tổ trưởng đã được GV chấp nhận.
 */
export function effectiveCounts(
  criteria: Criterion[],
  self: Counts,
  teacher: Counts | null,
  accepted: { criterionId: string | null; times: number }[],
): Counts {
  const out: Counts = {};
  for (const c of criteria) {
    const fromReports = accepted.filter((r) => r.criterionId === c.id).reduce((s, r) => s + r.times, 0);
    out[c.id] = teacher && c.id in teacher ? teacher[c.id] : (self[c.id] ?? 0) + fromReports;
  }
  return out;
}

export function computePoints(base: number, criteria: Criterion[], counts: Counts) {
  return criteria.reduce((sum, c) => sum + (counts[c.id] ?? 0) * c.points, base);
}

export type Thresholds = { ratingGood: number; ratingFair: number; ratingPass: number };

export const RATING_STYLE = {
  good: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  fair: "bg-sky-100 text-sky-800 ring-sky-200",
  pass: "bg-amber-50 text-amber-800 ring-amber-200",
  low: "bg-orange-50 text-orange-800 ring-orange-200",
} as const;

export function rating(points: number, t: Thresholds) {
  if (points >= t.ratingGood) return { label: "Tốt", style: RATING_STYLE.good };
  if (points >= t.ratingFair) return { label: "Khá", style: RATING_STYLE.fair };
  if (points >= t.ratingPass) return { label: "Đạt", style: RATING_STYLE.pass };
  return { label: "Cần cố gắng", style: RATING_STYLE.low };
}

export const RESPONSE_STATUS = {
  SUBMITTED: { label: "Chờ duyệt", style: "bg-sky-50 text-sky-800 ring-sky-200" },
  REVISION: { label: "Cần sửa", style: "bg-amber-50 text-amber-800 ring-amber-200" },
  APPROVED: { label: "Đã duyệt", style: "bg-emerald-100 text-emerald-800 ring-emerald-200" },
} as const;

/** Tên hiển thị của tổ n (1..groupCount) */
export function groupName(names: unknown, n: number) {
  const custom = Array.isArray(names) ? String(names[n - 1] ?? "").trim() : "";
  return custom || `Tổ ${n}`;
}

export function signed(n: number) {
  return n > 0 ? `+${n}` : String(n);
}
