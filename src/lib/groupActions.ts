"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireClassAccess } from "./auth";
import { audit } from "./audit";
import { MAX_GROUPS } from "./emulation";
import { classLockedMessage } from "./schoolYear";
import { groupName } from "./scoring";

export type GroupState = { error?: string; ok?: string } | null;

async function writableClass(classId: string) {
  const { user, classroom } = await requireClassAccess(classId);
  const locked = await classLockedMessage(classroom);
  return { user, classroom, locked };
}

function namesOf(raw: unknown, count: number) {
  const arr = Array.isArray(raw) ? raw.map((x) => String(x ?? "")) : [];
  return Array.from({ length: count }, (_, i) => arr[i] ?? "");
}

function revalidateGroups(classId: string) {
  revalidatePath(`/gv/lop/${classId}`, "layout");
  revalidatePath("/hs", "layout");
}

export async function addGroupAction(classId: string, _prev: GroupState, formData: FormData): Promise<GroupState> {
  const { user, classroom, locked } = await writableClass(classId);
  if (locked) return { error: locked };
  if (classroom.groupCount >= MAX_GROUPS) return { error: `Mỗi lớp tối đa ${MAX_GROUPS} tổ.` };
  const n = classroom.groupCount + 1;
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const names = [...namesOf(classroom.groupNames, classroom.groupCount), name];
  await prisma.classroom.update({ where: { id: classId }, data: { groupCount: n, groupNames: names } });
  await audit(user, "class.group.create", { classId, entity: "Classroom", entityId: classId, summary: `Lớp ${classroom.name}: tạo ${groupName(names, n)}` });
  revalidateGroups(classId);
  return { ok: `Đã tạo ${groupName(names, n)}.` };
}

export async function renameGroupAction(classId: string, groupNo: number, formData: FormData) {
  const { user, classroom, locked } = await writableClass(classId);
  if (locked || groupNo < 1 || groupNo > classroom.groupCount) return;
  const names = namesOf(classroom.groupNames, classroom.groupCount);
  const before = groupName(names, groupNo);
  names[groupNo - 1] = String(formData.get("name") ?? "").trim().slice(0, 60);
  await prisma.classroom.update({ where: { id: classId }, data: { groupNames: names } });
  await audit(user, "class.group.rename", {
    classId,
    entity: "Classroom",
    entityId: classId,
    summary: `Lớp ${classroom.name}: đổi tên ${before} → ${groupName(names, groupNo)}`,
  });
  revalidateGroups(classId);
}

/**
 * Xóa tổ cuối cùng; thành viên chuyển về "chưa phân tổ". Chỉ xóa tổ cuối để số thứ tự các tổ còn lại
 * không đổi, nên điểm thi đua đã ghi theo tổ vẫn đúng.
 */
export async function removeLastGroupAction(classId: string) {
  const { user, classroom, locked } = await writableClass(classId);
  if (locked || classroom.groupCount <= 1) return;
  const n = classroom.groupCount;
  const names = namesOf(classroom.groupNames, n);
  const removed = groupName(names, n);
  await prisma.$transaction([
    prisma.student.updateMany({ where: { classId, groupNo: n }, data: { groupNo: null, isGroupLeader: false } }),
    prisma.classroom.update({ where: { id: classId }, data: { groupCount: n - 1, groupNames: names.slice(0, n - 1) } }),
  ]);
  await audit(user, "class.group.delete", { classId, entity: "Classroom", entityId: classId, summary: `Lớp ${classroom.name}: xóa ${removed}` });
  revalidateGroups(classId);
}

export async function addMembersAction(classId: string, groupNo: number, _prev: GroupState, formData: FormData): Promise<GroupState> {
  const { user, classroom, locked } = await writableClass(classId);
  if (locked) return { error: locked };
  if (groupNo < 1 || groupNo > classroom.groupCount) return { error: "Tổ không hợp lệ." };
  const ids = [...new Set(formData.getAll("ids").map(String))];
  if (ids.length === 0) return { error: "Hãy chọn học sinh để thêm vào tổ." };
  const found = await prisma.student.findMany({
    where: { id: { in: ids }, classId },
    select: { id: true, groupNo: true, user: { select: { fullName: true } } },
  });
  // Chỉ thêm học sinh chưa có tổ (tổ đã bị xóa cũng tính là chưa có tổ); em đang ở tổ khác phải được đưa ra trước
  const inGroup = found.filter((s) => s.groupNo != null && s.groupNo >= 1 && s.groupNo <= classroom.groupCount);
  const students = found.filter((s) => !inGroup.includes(s));
  if (students.length === 0) {
    return { error: `${inGroup.map((s) => s.user.fullName).join(", ")} đã ở trong tổ. Hãy đưa ra khỏi tổ cũ trước.` };
  }
  await prisma.student.updateMany({ where: { id: { in: students.map((s) => s.id) } }, data: { groupNo, isGroupLeader: false } });
  const g = groupName(classroom.groupNames, groupNo);
  await audit(user, "class.group.members", {
    classId,
    entity: "Classroom",
    entityId: classId,
    summary: `Lớp ${classroom.name}: thêm ${students.map((s) => s.user.fullName).join(", ")} vào ${g}`,
  });
  revalidateGroups(classId);
  return {
    ok: `Đã thêm ${students.length} học sinh vào ${g}.${inGroup.length ? ` Bỏ qua ${inGroup.map((s) => s.user.fullName).join(", ")} (đã ở tổ khác).` : ""}`,
  };
}

export async function removeMemberAction(classId: string, studentId: string) {
  const { user, classroom, locked } = await writableClass(classId);
  if (locked) return;
  const student = await prisma.student.findFirst({ where: { id: studentId, classId }, include: { user: { select: { fullName: true } } } });
  if (!student?.groupNo) return;
  await prisma.student.update({ where: { id: studentId }, data: { groupNo: null, isGroupLeader: false } });
  await audit(user, "class.group.members", {
    classId,
    entity: "Classroom",
    entityId: classId,
    summary: `Lớp ${classroom.name}: đưa ${student.user.fullName} ra khỏi ${groupName(classroom.groupNames, student.groupNo)}`,
  });
  revalidateGroups(classId);
}

/** Mỗi tổ một tổ trưởng; chọn lại em đang là tổ trưởng thì bỏ chức tổ trưởng. */
export async function toggleLeaderAction(classId: string, studentId: string) {
  const { user, classroom, locked } = await writableClass(classId);
  if (locked) return;
  const student = await prisma.student.findFirst({ where: { id: studentId, classId }, include: { user: { select: { fullName: true } } } });
  if (!student?.groupNo) return;
  const g = groupName(classroom.groupNames, student.groupNo);
  if (student.isGroupLeader) {
    await prisma.student.update({ where: { id: studentId }, data: { isGroupLeader: false } });
  } else {
    await prisma.$transaction([
      prisma.student.updateMany({ where: { classId, groupNo: student.groupNo }, data: { isGroupLeader: false } }),
      prisma.student.update({ where: { id: studentId }, data: { isGroupLeader: true } }),
    ]);
  }
  await audit(user, "class.group.leader", {
    classId,
    entity: "Classroom",
    entityId: classId,
    summary: `Lớp ${classroom.name}: ${student.isGroupLeader ? "bỏ" : "chọn"} ${student.user.fullName} làm tổ trưởng ${g}`,
  });
  revalidateGroups(classId);
}
