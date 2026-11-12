// Khu vườn lớp: hạt giống, giai đoạn phát triển, nhân vật. Dùng chung cho client và server (không import Prisma).

/** Loại cây: "flower" mọc thân thảo + bông lớn; "tree" có thân gỗ, tán lá, hoa nhỏ và trái */
export type SeedDef = { name: string; kind: "flower" | "tree"; leaf: string; bloom: string; center: string; fruit: string; fruitName: string };

export const SEEDS: Record<string, SeedDef> = {
  sunflower: { name: "Hướng dương", kind: "flower", leaf: "#4d7c0f", bloom: "#facc15", center: "#7c2d12", fruit: "#a16207", fruitName: "hạt" },
  rose: { name: "Hoa hồng", kind: "flower", leaf: "#15803d", bloom: "#e11d48", center: "#9f1239", fruit: "#f43f5e", fruitName: "bông" },
  lotus: { name: "Hoa sen", kind: "flower", leaf: "#0f766e", bloom: "#f9a8d4", center: "#facc15", fruit: "#65a30d", fruitName: "gương sen" },
  orange: { name: "Cây cam", kind: "tree", leaf: "#166534", bloom: "#fefce8", center: "#fde047", fruit: "#f97316", fruitName: "quả cam" },
  apple: { name: "Cây táo", kind: "tree", leaf: "#15803d", bloom: "#fce7f3", center: "#f9a8d4", fruit: "#dc2626", fruitName: "quả táo" },
  mango: { name: "Cây xoài", kind: "tree", leaf: "#14532d", bloom: "#fef9c3", center: "#eab308", fruit: "#facc15", fruitName: "quả xoài" },
};

/**
 * Tham số nuôi cây của lớp (GVCN đặt). Điểm vườn = gardenStart + Σ(điểm tuần đã duyệt − điểm gốc) + điểm việc tốt.
 * Ví dụ mặc định: bắt đầu 100 (hạt giống), dưới 80 héo, dưới 70 khô lá, 105 nảy mầm, 110 có 2 lá,
 * mỗi 3 điểm thêm 1 lá, 140 trưởng thành ra trái, vượt 140 mỗi 5 điểm thêm 1 trái.
 */
export type GardenThresholds = {
  gardenStart: number;
  gardenWilt: number;
  gardenDry: number;
  gardenSprout: number;
  gardenTwoLeaves: number;
  gardenLeafStep: number;
  gardenMature: number;
  gardenFruitStep: number;
};

export type Phase = "dry" | "wilt" | "seed" | "sprout" | "growing" | "mature";
export const PHASE_LABEL: Record<Phase, string> = {
  dry: "Khô lá",
  wilt: "Héo",
  seed: "Hạt giống",
  sprout: "Nảy mầm",
  growing: "Đang lớn",
  mature: "Trưởng thành, ra trái",
};

/** wilt: 0 tươi, 1 héo, 2 khô lá */
export type PlantState = { phase: Phase; leaves: number; fruits: number; wilt: number };

const MAX_FRUITS = 12;

export function plantState(score: number, t: GardenThresholds): PlantState {
  if (score < t.gardenDry) return { phase: "dry", leaves: 2, fruits: 0, wilt: 2 };
  if (score < t.gardenWilt) return { phase: "wilt", leaves: 2, fruits: 0, wilt: 1 };
  if (score < t.gardenSprout) return { phase: "seed", leaves: 0, fruits: 0, wilt: 0 };
  if (score < t.gardenTwoLeaves) return { phase: "sprout", leaves: 1, fruits: 0, wilt: 0 };
  const step = Math.max(1, t.gardenLeafStep);
  const leaves = 2 + Math.floor((Math.min(score, t.gardenMature) - t.gardenTwoLeaves) / step);
  if (score < t.gardenMature) return { phase: "growing", leaves, fruits: 0, wilt: 0 };
  const fruits = Math.min(MAX_FRUITS, 1 + Math.floor((score - t.gardenMature) / Math.max(1, t.gardenFruitStep)));
  return { phase: "mature", leaves, fruits, wilt: 0 };
}

/** Mô tả ngắn: "Đang lớn · 7 lá", "Trưởng thành, ra trái · 3 quả cam" */
export function plantLabel(s: PlantState, fruitName = "trái") {
  if (s.phase === "growing") return `${PHASE_LABEL.growing} · ${s.leaves} lá`;
  if (s.phase === "mature") return `${PHASE_LABEL.mature} · ${s.fruits} ${fruitName}`;
  return PHASE_LABEL[s.phase];
}

/** Mục tiêu gần nhất: còn bao nhiêu điểm để cây thay đổi (hết héo, nảy mầm, thêm lá, ra trái, thêm trái) */
export function nextGoal(score: number, t: GardenThresholds): { need: number; goal: string } {
  if (score < t.gardenWilt) return { need: t.gardenWilt - score, goal: "cây hết héo" };
  if (score < t.gardenSprout) return { need: t.gardenSprout - score, goal: "nảy mầm" };
  if (score < t.gardenTwoLeaves) return { need: t.gardenTwoLeaves - score, goal: "có 2 lá" };
  const step = Math.max(1, t.gardenLeafStep);
  if (score < t.gardenMature) {
    const leaf = step - ((score - t.gardenTwoLeaves) % step);
    return leaf < t.gardenMature - score ? { need: leaf, goal: "thêm 1 lá" } : { need: t.gardenMature - score, goal: "trưởng thành, ra trái" };
  }
  const fs = Math.max(1, t.gardenFruitStep);
  return { need: fs - ((score - t.gardenMature) % fs), goal: "thêm 1 trái" };
}

/** Kiểm tra bộ tham số; trả về lỗi hoặc null */
export function validateThresholds(t: GardenThresholds): string | null {
  const all = Object.values(t);
  if (all.some((v) => !Number.isInteger(v) || v < 0 || v > 100000)) return "Các tham số là số nguyên không âm.";
  if (!(t.gardenDry < t.gardenWilt)) return "Mốc khô lá phải nhỏ hơn mốc héo.";
  if (!(t.gardenWilt <= t.gardenStart)) return "Điểm khởi đầu không được dưới mốc héo.";
  if (!(t.gardenStart <= t.gardenSprout)) return "Mốc nảy mầm phải từ điểm khởi đầu trở lên.";
  if (!(t.gardenSprout < t.gardenTwoLeaves && t.gardenTwoLeaves < t.gardenMature)) return "Các mốc phải tăng dần: nảy mầm < có 2 lá < trưởng thành.";
  if (t.gardenLeafStep < 1 || t.gardenFruitStep < 1) return "Số điểm để thêm 1 lá / 1 trái phải từ 1 trở lên.";
  return null;
}

/** Chỉ lấy các tham số (để truyền sang component chạy trên trình duyệt) */
export function pickThresholds(c: GardenThresholds): GardenThresholds {
  return {
    gardenStart: c.gardenStart,
    gardenWilt: c.gardenWilt,
    gardenDry: c.gardenDry,
    gardenSprout: c.gardenSprout,
    gardenTwoLeaves: c.gardenTwoLeaves,
    gardenLeafStep: c.gardenLeafStep,
    gardenMature: c.gardenMature,
    gardenFruitStep: c.gardenFruitStep,
  };
}

// ---------- Nhân vật ----------

export const SKINS = ["#fde2c8", "#f5c9a0", "#e0a878", "#c68a5a", "#8d5a3b"];
export const HAIRS = ["ngan", "dai", "buoc", "xu", "bui"] as const;
export const HAIR_LABEL: Record<(typeof HAIRS)[number], string> = { ngan: "Ngắn", dai: "Dài", buoc: "Buộc đuôi ngựa", xu: "Tóc xù", bui: "Búi tó" };
export const HAIR_COLORS = ["#1f1a17", "#4a2c1d", "#7b4a26", "#b7791f", "#9ca3af"];
export const SHIRTS = ["#2563eb", "#dc2626", "#16a34a", "#f59e0b", "#7c3aed", "#ec4899", "#0d9488", "#f8fafc"];
export const PANTS = ["#1e3a8a", "#374151", "#78350f", "#0f172a", "#065f46"];
export const ACCS = ["none", "kinh", "mu", "no"] as const;
export const ACC_LABEL: Record<(typeof ACCS)[number], string> = { none: "Không", kinh: "Kính", mu: "Mũ lưỡi trai", no: "Nơ" };

export type Character = {
  skin: string;
  hair: (typeof HAIRS)[number];
  hairColor: string;
  shirt: string;
  pants: string;
  acc: (typeof ACCS)[number];
};

function pick<T>(list: readonly T[], seed: number) {
  return list[seed % list.length];
}

/** Nhân vật mặc định (cố định theo mã học sinh) khi em chưa tự tạo */
export function defaultCharacter(id: string): Character {
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return {
    skin: pick(SKINS, h),
    hair: pick(HAIRS, h >> 3),
    hairColor: pick(HAIR_COLORS, h >> 6),
    shirt: pick(SHIRTS, h >> 9),
    pants: pick(PANTS, h >> 12),
    acc: "none",
  };
}

/** Làm sạch dữ liệu nhân vật từ DB hoặc form; giá trị lạ thì dùng mặc định */
export function parseCharacter(raw: unknown, id: string): Character {
  const d = defaultCharacter(id);
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const oneOf = <T>(list: readonly T[], v: unknown, fallback: T) => (list.includes(v as T) ? (v as T) : fallback);
  return {
    skin: oneOf(SKINS, r.skin, d.skin),
    hair: oneOf(HAIRS, r.hair, d.hair),
    hairColor: oneOf(HAIR_COLORS, r.hairColor, d.hairColor),
    shirt: oneOf(SHIRTS, r.shirt, d.shirt),
    pants: oneOf(PANTS, r.pants, d.pants),
    acc: oneOf(ACCS, r.acc, d.acc),
  };
}

// ---------- Bản đồ ----------

/** Số ô đất mỗi hàng; mỗi ô đất cách nhau 2 ô lưới */
export const PLOTS_PER_ROW = 10;
export const TILE = 32;

/** Kích thước bản đồ (ô lưới) theo số học sinh */
export function mapSize(count: number) {
  const rows = Math.max(1, Math.ceil(count / PLOTS_PER_ROW));
  return { w: PLOTS_PER_ROW * 2 + 4, h: rows * 3 + 7 };
}

/** Vị trí ô đất thứ i (ô lưới, góc trên trái của ô đất) */
export function plotPos(i: number) {
  return { x: 2 + (i % PLOTS_PER_ROW) * 2, y: 4 + Math.floor(i / PLOTS_PER_ROW) * 3 };
}

