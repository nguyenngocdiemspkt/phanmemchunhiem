import type { GardenCycle } from "@prisma/client";
import { prisma } from "./db";
import { validateThresholds, type GardenThresholds } from "./garden";

export type GardenSettings = GardenThresholds & { gardenCycle: GardenCycle };

/** Bộ chuẩn mặc định khi quản trị chưa chỉnh */
export const DEFAULT_GARDEN: GardenSettings = {
  gardenCycle: "SEMESTER",
  gardenStart: 100,
  gardenWilt: 80,
  gardenDry: 70,
  gardenSprout: 105,
  gardenTwoLeaves: 110,
  gardenLeafStep: 3,
  gardenMature: 140,
  gardenFruitStep: 5,
};

const KEY = "garden";

/** Đọc bộ tham số vườn từ form (dùng chung cho quản trị và GVCN); trả về lỗi nếu không hợp lệ */
export function readGardenSettings(formData: FormData): GardenSettings | { error: string } {
  const num = (k: keyof GardenThresholds) => Number(formData.get(k));
  const t: GardenThresholds = {
    gardenStart: num("gardenStart"),
    gardenWilt: num("gardenWilt"),
    gardenDry: num("gardenDry"),
    gardenSprout: num("gardenSprout"),
    gardenTwoLeaves: num("gardenTwoLeaves"),
    gardenLeafStep: num("gardenLeafStep"),
    gardenMature: num("gardenMature"),
    gardenFruitStep: num("gardenFruitStep"),
  };
  const error = validateThresholds(t);
  if (error) return { error };
  return { ...t, gardenCycle: formData.get("gardenCycle") === "YEAR" ? "YEAR" : "SEMESTER" };
}

/** Bộ chuẩn của hệ thống: lớp mới tạo dùng bộ này */
export async function getGardenPreset(): Promise<GardenSettings> {
  const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
  if (!row || typeof row.value !== "object" || row.value === null) return DEFAULT_GARDEN;
  const merged = { ...DEFAULT_GARDEN, ...(row.value as Partial<GardenSettings>) };
  const { gardenCycle, ...t } = merged;
  return validateThresholds(t) ? DEFAULT_GARDEN : { ...t, gardenCycle: gardenCycle === "YEAR" ? "YEAR" : "SEMESTER" };
}

export async function saveGardenPreset(settings: GardenSettings) {
  await prisma.systemSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: settings }, update: { value: settings } });
}
