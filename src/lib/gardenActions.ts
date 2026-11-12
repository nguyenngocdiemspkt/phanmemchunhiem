"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireClassAccess, requireStudent, requireUser } from "./auth";
import { audit } from "./audit";
import { mapSize, parseCharacter, SEEDS } from "./garden";
import { getGardenPreset, readGardenSettings, saveGardenPreset, type GardenSettings } from "./gardenPreset";
import { cycleOf } from "./gardenService";

export type GardenState = { error?: string; ok?: string } | null;

export async function saveCharacterAction(_prev: GardenState, formData: FormData): Promise<GardenState> {
  const { student } = await requireStudent();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("character") ?? "{}"));
  } catch {
    return { error: "Dữ liệu không hợp lệ." };
  }
  await prisma.student.update({ where: { id: student.id }, data: { character: parseCharacter(raw, student.id) } });
  revalidatePath("/hs/vuon");
  return { ok: "Đã lưu nhân vật của em." };
}

/** Chọn hạt giống cho chu kỳ hiện tại (chỉ khi chưa trồng cây nào trong chu kỳ này) */
export async function chooseSeedAction(seed: string): Promise<GardenState> {
  const { student } = await requireStudent();
  if (!SEEDS[seed]) return { error: "Hạt giống không hợp lệ." };
  const classroom = await prisma.classroom.findUniqueOrThrow({ where: { id: student.classId }, include: { year: true } });
  const cycle = cycleOf(classroom.year, classroom.gardenCycle);
  if (student.seedType && student.seedCycle === cycle.key) return { error: "Em đã trồng cây cho chu kỳ này rồi." };
  await prisma.student.update({ where: { id: student.id }, data: { seedType: seed, seedCycle: cycle.key } });
  revalidatePath("/hs/vuon");
  return { ok: `Em đã gieo hạt ${SEEDS[seed].name}.` };
}

/** Lưu vị trí nhân vật (trình duyệt gửi khi em dừng di chuyển) */
export async function moveAction(x: number, y: number) {
  const { student } = await requireStudent();
  const count = await prisma.student.count({ where: { classId: student.classId, status: "ACTIVE" } });
  const { w, h } = mapSize(count);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return;
  await prisma.student.update({
    where: { id: student.id },
    data: { posX: Math.min(w - 2, Math.max(1, x)), posY: Math.min(h - 2, Math.max(1, y)), posAt: new Date() },
  });
}

export async function saveGardenSettingsAction(classId: string, _prev: GardenState, formData: FormData): Promise<GardenState> {
  const { user, classroom } = await requireClassAccess(classId);
  const data = readGardenSettings(formData);
  if ("error" in data) return { error: data.error };
  await prisma.classroom.update({ where: { id: classId }, data });
  await audit(user, "class.garden", { classId, entity: "Classroom", entityId: classId, summary: `Lớp ${classroom.name}: ${describeGarden(data)}` });
  revalidatePath(`/gv/lop/${classId}/vuon`);
  revalidatePath("/hs/vuon");
  return { ok: "Đã lưu cài đặt vườn lớp." };
}

/** GVCN đưa cài đặt vườn của lớp về bộ chuẩn của hệ thống */
export async function resetGardenToPresetAction(classId: string, _prev: GardenState): Promise<GardenState> {
  const { user, classroom } = await requireClassAccess(classId);
  const preset = await getGardenPreset();
  await prisma.classroom.update({ where: { id: classId }, data: preset });
  await audit(user, "class.garden", { classId, entity: "Classroom", entityId: classId, summary: `Lớp ${classroom.name}: dùng bộ chuẩn của hệ thống (${describeGarden(preset)})` });
  revalidatePath(`/gv/lop/${classId}/vuon`);
  revalidatePath("/hs/vuon");
  return { ok: "Đã áp dụng bộ chuẩn của hệ thống cho lớp." };
}

/** Quản trị sửa bộ chuẩn của hệ thống (lớp tạo sau dùng bộ này; lớp đang có giữ nguyên) */
export async function saveGardenPresetAction(_prev: GardenState, formData: FormData): Promise<GardenState> {
  const user = await requireUser(["ADMIN"]);
  const data = readGardenSettings(formData);
  if ("error" in data) return { error: data.error };
  await saveGardenPreset(data);
  await audit(user, "year.garden-preset", { entity: "SystemSetting", entityId: "garden", summary: `Sửa bộ chuẩn vườn lớp: ${describeGarden(data)}` });
  revalidatePath("/admin/cau-hinh-vuon");
  return { ok: "Đã lưu bộ chuẩn. Các lớp tạo từ bây giờ sẽ dùng bộ này." };
}

function describeGarden(d: GardenSettings) {
  return `thu hoạch ${d.gardenCycle === "YEAR" ? "cuối năm" : "mỗi học kỳ"}; khởi đầu ${d.gardenStart}, héo < ${d.gardenWilt}, khô < ${d.gardenDry}, nảy mầm ${d.gardenSprout}, 2 lá ${d.gardenTwoLeaves} (+1 lá/${d.gardenLeafStep} điểm), ra trái ${d.gardenMature} (+1 trái/${d.gardenFruitStep} điểm)`;
}
