"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStudentAccess, requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fromDateInput } from "@/lib/format";
import { classLockedMessage } from "@/lib/schoolYear";
import { applyStudentStatus, enrollStudent, parseStatus, STUDENT_STATUS, studentCodeOwner } from "@/lib/students";

export type ProfileState = { error?: string; ok?: string } | null;

const PROFILE_LABEL = {
  fullName: "Họ tên",
  studentCode: "Mã HS",
  dateOfBirth: "Ngày sinh",
  gender: "Giới tính",
  address: "Địa chỉ",
  parentName: "Phụ huynh",
  parentPhone: "SĐT phụ huynh",
  note: "Ghi chú",
} as const;

export async function updateProfileAction(studentId: string, _prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { user, student } = await requireStudentAccess(studentId);
  const locked = await classLockedMessage(student.classroom);
  if (locked) return { error: locked };
  const get = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const fullName = get("fullName");
  if (!fullName) return { error: "Họ tên không được để trống." };
  const data = {
    studentCode: get("studentCode"),
    dateOfBirth: get("dateOfBirth"),
    gender: get("gender"),
    address: get("address"),
    parentName: get("parentName"),
    parentPhone: get("parentPhone"),
    note: get("note"),
  };
  if (data.studentCode) {
    const owner = await studentCodeOwner(data.studentCode, student.classroom.schoolYear, studentId);
    if (owner) return { error: `Mã học sinh ${data.studentCode} đã được dùng cho ${owner} trong năm học này.` };
  }

  await prisma.user.update({ where: { id: student.userId }, data: { fullName, student: { update: data } } });

  const before: Record<string, string | null> = {
    fullName: student.user.fullName,
    studentCode: student.studentCode,
    dateOfBirth: student.dateOfBirth,
    gender: student.gender,
    address: student.address,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    note: student.note,
  };
  const after: Record<string, string | null> = { ...data, fullName };
  const changes = (Object.keys(PROFILE_LABEL) as (keyof typeof PROFILE_LABEL)[])
    .filter((k) => (before[k] ?? null) !== (after[k] ?? null))
    .map((k) => `${PROFILE_LABEL[k]}: ${before[k] ?? "(trống)"} → ${after[k] ?? "(trống)"}`);
  if (changes.length) {
    await audit(user, "student.update", {
      entity: "Student",
      entityId: studentId,
      classId: student.classId,
      summary: `Sửa hồ sơ ${fullName}: ${changes.join("; ")}`,
    });
  }
  revalidatePath(`/gv/hoc-sinh/${studentId}`);
  return { ok: "Đã lưu thông tin." };
}

export async function setStudentStatusAction(studentId: string, _prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { user, student } = await requireStudentAccess(studentId);
  const locked = await classLockedMessage(student.classroom);
  if (locked) return { error: locked };
  const status = parseStatus(formData.get("status"));
  if (!status) return { error: "Trạng thái không hợp lệ." };
  if (status === student.status) return { ok: "Không có thay đổi." };
  await prisma.$transaction((tx) => applyStudentStatus(tx, studentId, status));
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300);
  await audit(user, "student.status", {
    entity: "Student",
    entityId: studentId,
    classId: student.classId,
    summary: `${student.user.fullName}: ${STUDENT_STATUS[student.status].label} → ${STUDENT_STATUS[status].label}${reason ? ` (${reason})` : ""}`,
  });
  revalidatePath(`/gv/lop/${student.classId}`, "layout");
  revalidatePath(`/gv/hoc-sinh/${studentId}`);
  return { ok: `Đã chuyển trạng thái thành "${STUDENT_STATUS[status].label}".` };
}

/**
 * Chuyển học sinh sang lớp khác (chỉ quản trị). Phiếu, nhận xét, ghi chú cũ vẫn gắn với học sinh,
 * nên hồ sơ tiến bộ không bị mất; tổ và vai trò cán sự được bỏ vì thuộc lớp cũ.
 */
export async function transferStudentAction(studentId: string, _prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const actor = await requireUser(["ADMIN"]);
  const { student } = await requireStudentAccess(studentId);
  const target = await prisma.classroom.findUnique({ where: { id: String(formData.get("toClassId") ?? "") }, include: { year: true } });
  if (!target || target.id === student.classId) return { error: "Vui lòng chọn lớp mới." };
  if (target.year.locked) return { error: `Năm học ${target.schoolYear} đã khóa.` };
  if (student.studentCode) {
    const owner = await studentCodeOwner(student.studentCode, target.schoolYear, studentId);
    if (owner) return { error: `Năm học ${target.schoolYear} đã có học sinh mang mã ${student.studentCode}: ${owner}.` };
  }
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 300) || null;

  await prisma.$transaction(async (tx) => {
    await enrollStudent(tx, studentId, target);
    await tx.classTransfer.create({
      data: { studentId, fromClassId: student.classId, toClassId: target.id, reason, actorId: actor.id },
    });
  });
  const summary = `Chuyển ${student.user.fullName} từ lớp ${student.classroom.name} (${student.classroom.schoolYear}) sang lớp ${target.name} (${target.schoolYear})${reason ? `: ${reason}` : ""}`;
  // Ghi vào nhật ký của cả hai lớp
  await audit(actor, "student.transfer", { entity: "Student", entityId: studentId, classId: student.classId, summary });
  await audit(actor, "student.transfer", { entity: "Student", entityId: studentId, classId: target.id, summary });
  revalidatePath("/", "layout");
  return { ok: `Đã chuyển sang lớp ${target.name}.` };
}

export async function addNoteAction(studentId: string, _prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const { user } = await requireStudentAccess(studentId);
  const content = String(formData.get("content") ?? "").trim().slice(0, 2000);
  const rawType = String(formData.get("type"));
  const type = rawType === "PROGRESS" ? "PROGRESS" : rawType === "CONCERN" ? "CONCERN" : "POSITIVE";
  const date = fromDateInput(String(formData.get("date") ?? "")) ?? new Date();
  if (!content) return { error: "Vui lòng nhập nội dung ghi nhận." };
  await prisma.note.create({
    data: {
      studentId,
      authorId: user.id,
      type,
      content,
      date,
      // Ghi chú "cần quan tâm" luôn chỉ giáo viên thấy
      visibleToStudent: type !== "CONCERN" && formData.get("visibleToStudent") === "on",
    },
  });
  revalidatePath(`/gv/hoc-sinh/${studentId}`);
  return { ok: "Đã thêm ghi nhận." };
}

export async function deleteNoteAction(studentId: string, noteId: string) {
  const { user, student } = await requireStudentAccess(studentId);
  const note = await prisma.note.findFirst({ where: { id: noteId, studentId } });
  if (!note) return;
  await prisma.note.delete({ where: { id: note.id } });
  await audit(user, "student.note.delete", {
    entity: "Student",
    entityId: studentId,
    classId: student.classId,
    summary: `Xóa ghi nhận của ${student.user.fullName}: "${note.content.slice(0, 120)}"`,
    detail: JSON.parse(JSON.stringify(note)),
  });
  revalidatePath(`/gv/hoc-sinh/${studentId}`);
}
