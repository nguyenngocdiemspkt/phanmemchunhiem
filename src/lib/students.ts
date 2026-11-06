import type { Prisma, StudentStatus } from "@prisma/client";
import { prisma } from "./db";

export const STUDENT_STATUS: Record<StudentStatus, { label: string; style: string }> = {
  ACTIVE: { label: "Đang học", style: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  TRANSFERRED: { label: "Chuyển trường", style: "bg-amber-50 text-amber-800 ring-amber-200" },
  LEFT: { label: "Nghỉ học", style: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function parseStatus(v: unknown): StudentStatus | null {
  return v === "ACTIVE" || v === "TRANSFERRED" || v === "LEFT" ? v : null;
}

/**
 * Đổi trạng thái học sinh. Hồ sơ và phiếu đã nộp luôn được giữ lại;
 * học sinh không còn "Đang học" thì bị khóa đăng nhập, quay lại "Đang học" thì mở lại.
 */
export async function applyStudentStatus(tx: Prisma.TransactionClient, studentId: string, status: StudentStatus) {
  return tx.student.update({
    where: { id: studentId },
    data: { status, statusChangedAt: new Date(), user: { update: { active: status === "ACTIVE" } } },
    include: { user: { select: { fullName: true } } },
  });
}

/**
 * Mỗi học sinh chỉ có một tài khoản trong một năm học: mã học sinh không được trùng
 * giữa các lớp cùng năm học. Trả về họ tên + lớp của học sinh đang giữ mã, hoặc null.
 */
export async function studentCodeOwner(code: string, schoolYear: string, exceptStudentId?: string) {
  const owner = await prisma.student.findFirst({
    where: {
      studentCode: { equals: code, mode: "insensitive" },
      OR: [{ classroom: { schoolYear } }, { enrollments: { some: { schoolYear } } }],
      ...(exceptStudentId ? { NOT: { id: exceptStudentId } } : {}),
    },
    select: { user: { select: { fullName: true } }, classroom: { select: { name: true } } },
  });
  return owner ? `${owner.user.fullName} (lớp ${owner.classroom.name})` : null;
}

/** Sắp xếp theo tên (từ cuối) như sổ điểm Việt Nam */
export function byVietnameseName<T>(getName: (x: T) => string) {
  const lastWord = (s: string) => s.trim().split(/\s+/).at(-1) ?? s;
  return (a: T, b: T) => {
    const na = getName(a);
    const nb = getName(b);
    return lastWord(na).localeCompare(lastWord(nb), "vi") || na.localeCompare(nb, "vi");
  };
}

/**
 * Xếp học sinh vào lớp `classroom`. Mỗi học sinh chỉ thuộc 1 lớp trong 1 năm học:
 * cùng năm học thì đổi lớp của năm đó, năm học khác thì thêm dòng xếp lớp mới (lên lớp).
 * Lớp mới nhất trở thành lớp hiện tại; tổ, cán sự, tổ trưởng của lớp cũ được bỏ.
 */
export async function enrollStudent(
  tx: Prisma.TransactionClient,
  studentId: string,
  classroom: { id: string; schoolYear: string },
) {
  await tx.enrollment.upsert({
    where: { studentId_schoolYear: { studentId, schoolYear: classroom.schoolYear } },
    create: { studentId, classId: classroom.id, schoolYear: classroom.schoolYear },
    update: { classId: classroom.id },
  });
  const student = await tx.student.findUniqueOrThrow({
    where: { id: studentId },
    select: { classId: true, classroom: { select: { schoolYear: true } } },
  });
  // Chỉ đổi lớp hiện tại khi lớp mới thuộc năm học bằng hoặc sau năm học của lớp hiện tại ("2026-2027" so sánh được theo chuỗi)
  if (student.classId !== classroom.id && classroom.schoolYear >= student.classroom.schoolYear) {
    await tx.student.update({
      where: { id: studentId },
      data: { classId: classroom.id, groupNo: null, isMonitor: false, isGroupLeader: false },
    });
  }
}

/** Lớp của học sinh trong năm học, nếu đã được xếp */
export async function enrolledClassIn(studentId: string, schoolYear: string) {
  const e = await prisma.enrollment.findUnique({
    where: { studentId_schoolYear: { studentId, schoolYear } },
    include: { classroom: { select: { id: true, name: true } } },
  });
  return e?.classroom ?? null;
}

/**
 * Xếp cả nhóm học sinh (chưa có lớp trong năm học của lớp đích) vào lớp, trong một lô lệnh:
 * thêm dòng xếp lớp, đổi lớp hiện tại (chỉ khi lớp đích không cũ hơn lớp hiện tại), ghi lịch sử chuyển lớp.
 */
export function enrollManyOps(
  classroom: { id: string; schoolYear: string },
  studentIds: string[],
  transfer: { fromClassId: string | null; reason: string; actorId: string },
) {
  return [
    prisma.enrollment.createMany({
      data: studentIds.map((studentId) => ({ studentId, classId: classroom.id, schoolYear: classroom.schoolYear })),
      skipDuplicates: true,
    }),
    prisma.student.updateMany({
      where: { id: { in: studentIds }, classroom: { schoolYear: { lte: classroom.schoolYear } } },
      data: { classId: classroom.id, groupNo: null, isMonitor: false, isGroupLeader: false },
    }),
    prisma.classTransfer.createMany({
      data: studentIds.map((studentId) => ({ studentId, toClassId: classroom.id, ...transfer })),
    }),
  ];
}
