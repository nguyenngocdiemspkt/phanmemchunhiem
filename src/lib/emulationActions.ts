"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireClassAccess } from "./auth";
import { fromDateInput } from "./format";
import { MAX_GROUPS, monitorCanEdit, requireEmulationAccess } from "./emulation";
import { audit } from "./audit";

export type EmulationState = { error?: string; ok?: string } | null;

function revalidateEmulation(classId: string) {
  revalidatePath(`/gv/lop/${classId}/thi-dua`, "layout");
  revalidatePath("/hs/thi-dua");
}

export async function addRecordAction(classId: string, _prev: EmulationState, formData: FormData): Promise<EmulationState> {
  const { user, classroom, level } = await requireEmulationAccess(classId);
  if (level === "viewer") return { error: "Chỉ giáo viên chủ nhiệm và cán sự lớp được ghi điểm." };

  const date = fromDateInput(String(formData.get("date") ?? ""));
  if (!date) return { error: "Ngày không hợp lệ." };
  if (level === "monitor" && !monitorCanEdit(date)) {
    return { error: "Cán sự chỉ ghi điểm cho các ngày trong tuần này (không ghi trước ngày)." };
  }

  // Đối tượng: "g:2" = cả tổ 2, "s:<id>" = một học sinh (điểm tính vào tổ của em)
  const target = String(formData.get("target") ?? "");
  let groupNo: number;
  let studentId: string | null = null;
  if (target.startsWith("g:")) {
    groupNo = Number(target.slice(2));
  } else if (target.startsWith("s:")) {
    const student = await prisma.student.findFirst({ where: { id: target.slice(2), classId }, select: { id: true, groupNo: true } });
    if (!student) return { error: "Không tìm thấy học sinh." };
    if (!student.groupNo) return { error: "Học sinh này chưa được phân tổ. Giáo viên phân tổ trong mục Cài đặt thi đua." };
    groupNo = student.groupNo;
    studentId = student.id;
  } else {
    return { error: "Vui lòng chọn tổ hoặc học sinh." };
  }
  if (!Number.isInteger(groupNo) || groupNo < 1 || groupNo > classroom.groupCount) return { error: "Tổ không hợp lệ." };

  const categoryId = String(formData.get("categoryId") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 300);
  let content: string;
  let points: number;
  if (categoryId === "custom") {
    content = note;
    points = Number(formData.get("points"));
    if (!content) return { error: "Vui lòng nhập nội dung." };
    if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 100) {
      return { error: "Điểm phải là số nguyên khác 0, từ -100 đến 100." };
    }
  } else {
    const category = await prisma.emulationCategory.findFirst({ where: { id: categoryId, classId } });
    if (!category) return { error: "Vui lòng chọn nội dung thi đua." };
    content = note ? `${category.name} (${note})` : category.name;
    points = category.points;
  }

  await prisma.emulationRecord.create({ data: { classId, groupNo, studentId, content, points, date, authorId: user.id } });
  revalidateEmulation(classId);
  return { ok: `Đã ghi ${points > 0 ? "+" : ""}${points} điểm cho tổ ${groupNo}.` };
}

export async function deleteRecordAction(classId: string, recordId: string) {
  const { user, level } = await requireEmulationAccess(classId);
  const record = await prisma.emulationRecord.findFirst({ where: { id: recordId, classId } });
  if (!record) return;
  const allowed = level === "teacher" || (level === "monitor" && record.authorId === user.id && monitorCanEdit(record.date));
  if (!allowed) return;
  await prisma.emulationRecord.delete({ where: { id: recordId } });
  revalidateEmulation(classId);
}

/** Số tổ, phân tổ và chỉ định cán sự (chỉ giáo viên). */
export async function saveGroupsAction(classId: string, _prev: EmulationState, formData: FormData): Promise<EmulationState> {
  await requireClassAccess(classId);
  const groupCount = Number(formData.get("groupCount"));
  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > MAX_GROUPS) {
    return { error: `Số tổ phải từ 1 đến ${MAX_GROUPS}.` };
  }
  const students = await prisma.student.findMany({ where: { classId }, select: { id: true, groupNo: true } });
  await prisma.$transaction([
    prisma.classroom.update({ where: { id: classId }, data: { groupCount } }),
    ...students.map((s) => {
      const g = Number(formData.get(`group_${s.id}`));
      const groupNo = Number.isInteger(g) && g >= 1 && g <= groupCount ? g : null;
      return prisma.student.update({
        where: { id: s.id },
        data: {
          groupNo,
          isMonitor: formData.get(`monitor_${s.id}`) === "on",
          // Đổi tổ thì thôi làm tổ trưởng tổ cũ
          ...(groupNo !== s.groupNo ? { isGroupLeader: false } : {}),
        },
      });
    }),
  ]);
  revalidateEmulation(classId);
  return { ok: "Đã lưu phân tổ và cán sự." };
}

/** Thay toàn bộ danh mục. Điểm đã ghi không đổi vì bản ghi lưu sẵn nội dung và điểm. */
export async function saveCategoriesAction(classId: string, _prev: EmulationState, formData: FormData): Promise<EmulationState> {
  await requireClassAccess(classId);
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("categories") ?? "[]"));
  } catch {
    return { error: "Dữ liệu không hợp lệ." };
  }
  if (!Array.isArray(raw)) return { error: "Dữ liệu không hợp lệ." };
  const categories: { name: string; points: number }[] = [];
  for (const [i, c] of raw.entries()) {
    const name = String(c?.name ?? "").trim().slice(0, 200);
    const points = Number(c?.points);
    if (!name) return { error: `Dòng ${i + 1}: chưa nhập tên nội dung.` };
    if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 100) {
      return { error: `Dòng ${i + 1}: điểm phải là số nguyên khác 0, từ -100 đến 100.` };
    }
    categories.push({ name, points });
  }
  if (categories.length === 0) return { error: "Cần ít nhất một tiêu chí." };
  if (categories.length > 100) return { error: "Tối đa 100 nội dung." };

  await prisma.$transaction([
    prisma.emulationCategory.deleteMany({ where: { classId } }),
    prisma.emulationCategory.createMany({ data: categories.map((c, i) => ({ ...c, classId, sortOrder: i })) }),
  ]);
  revalidateEmulation(classId);
  return { ok: "Đã lưu tiêu chí." };
}

/** Điểm gốc mỗi tuần và ngưỡng xếp loại Tốt / Khá / Đạt của lớp (áp dụng cho các đợt tạo sau) */
export async function saveScoringSettingsAction(classId: string, _prev: EmulationState, formData: FormData): Promise<EmulationState> {
  const { user, classroom } = await requireClassAccess(classId);
  const num = (k: string) => Number(formData.get(k));
  const data = { baseScore: num("baseScore"), ratingGood: num("ratingGood"), ratingFair: num("ratingFair"), ratingPass: num("ratingPass") };
  if (Object.values(data).some((v) => !Number.isInteger(v) || v < 0 || v > 1000)) return { error: "Các mức điểm phải là số nguyên từ 0 đến 1000." };
  if (!(data.ratingGood >= data.ratingFair && data.ratingFair >= data.ratingPass)) {
    return { error: "Ngưỡng phải giảm dần: Tốt ≥ Khá ≥ Đạt." };
  }
  await prisma.classroom.update({ where: { id: classId }, data });
  await audit(user, "class.scoring", {
    classId,
    entity: "Classroom",
    entityId: classId,
    summary: `Lớp ${classroom.name}: điểm gốc ${data.baseScore}, Tốt ≥ ${data.ratingGood}, Khá ≥ ${data.ratingFair}, Đạt ≥ ${data.ratingPass}`,
  });
  revalidateEmulation(classId);
  return { ok: "Đã lưu. Điểm gốc mới áp dụng cho các đợt tạo từ bây giờ; ngưỡng xếp loại áp dụng ngay." };
}
