"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { fmtDate, fromDateInput } from "@/lib/format";
import { firstYearOf, validateYearDates } from "@/lib/schoolYear";
import { enrollManyOps } from "@/lib/students";

export type YearFormState = { error?: string; ok?: string } | null;

function readDates(formData: FormData) {
  const startDate = fromDateInput(String(formData.get("startDate") ?? ""));
  const semester2Start = fromDateInput(String(formData.get("semester2Start") ?? ""));
  const endDate = fromDateInput(String(formData.get("endDate") ?? ""));
  if (!startDate || !semester2Start || !endDate) return { error: "Vui lòng nhập đủ ba mốc thời gian." } as const;
  const dates = { startDate, semester2Start, endDate };
  const error = validateYearDates(dates);
  return error ? ({ error } as const) : dates;
}

export async function createYearAction(_prev: YearFormState, formData: FormData): Promise<YearFormState> {
  const user = await requireUser(["ADMIN"]);
  const name = String(formData.get("name") ?? "").trim();
  if (firstYearOf(name) == null) return { error: 'Tên năm học có dạng "2026-2027".' };
  const dates = readDates(formData);
  if ("error" in dates) return { error: dates.error };
  if (await prisma.schoolYear.findUnique({ where: { name } })) return { error: `Năm học ${name} đã có.` };

  const makeCurrent = formData.get("isCurrent") === "on" || (await prisma.schoolYear.count()) === 0;
  const year = await prisma.$transaction(async (tx) => {
    if (makeCurrent) await tx.schoolYear.updateMany({ data: { isCurrent: false } });
    return tx.schoolYear.create({ data: { name, ...dates, isCurrent: makeCurrent } });
  });
  await audit(user, "year.create", {
    entity: "SchoolYear",
    entityId: year.id,
    summary: `Tạo năm học ${name} (${fmtDate(dates.startDate)} – ${fmtDate(dates.endDate)})`,
  });
  revalidatePath("/admin", "layout");
  return { ok: `Đã tạo năm học ${name}.` };
}

export async function updateYearAction(yearId: string, formData: FormData) {
  const user = await requireUser(["ADMIN"]);
  const dates = readDates(formData);
  if ("error" in dates) return;
  const year = await prisma.schoolYear.update({ where: { id: yearId }, data: dates });
  await audit(user, "year.update", {
    entity: "SchoolYear",
    entityId: yearId,
    summary: `Sửa mốc thời gian năm học ${year.name}`,
    detail: { startDate: fmtDate(dates.startDate), semester2Start: fmtDate(dates.semester2Start), endDate: fmtDate(dates.endDate) },
  });
  revalidatePath("/admin", "layout");
}

export async function setCurrentYearAction(yearId: string) {
  const user = await requireUser(["ADMIN"]);
  const year = await prisma.$transaction(async (tx) => {
    await tx.schoolYear.updateMany({ data: { isCurrent: false } });
    return tx.schoolYear.update({ where: { id: yearId }, data: { isCurrent: true } });
  });
  await audit(user, "year.current", { entity: "SchoolYear", entityId: yearId, summary: `Đặt ${year.name} là năm học hiện tại` });
  revalidatePath("/", "layout");
}

export async function toggleYearLockAction(yearId: string) {
  const user = await requireUser(["ADMIN"]);
  const current = await prisma.schoolYear.findUnique({ where: { id: yearId } });
  if (!current) return;
  const year = await prisma.schoolYear.update({ where: { id: yearId }, data: { locked: !current.locked } });
  await audit(user, year.locked ? "year.lock" : "year.unlock", {
    entity: "SchoolYear",
    entityId: yearId,
    summary: `${year.locked ? "Khóa" : "Mở khóa"} năm học ${year.name}`,
  });
  revalidatePath("/", "layout");
}

export async function deleteYearAction(yearId: string) {
  const user = await requireUser(["ADMIN"]);
  const year = await prisma.schoolYear.findUnique({ where: { id: yearId }, include: { _count: { select: { classes: true } } } });
  // Chỉ xóa được năm học chưa có lớp (tạo nhầm)
  if (!year || year._count.classes > 0) return;
  await prisma.schoolYear.delete({ where: { id: yearId } });
  await audit(user, "year.delete", { entity: "SchoolYear", entityId: yearId, summary: `Xóa năm học ${year.name}` });
  revalidatePath("/admin", "layout");
}

export type CopyClassesState = { error?: string; ok?: string; details?: string[] } | null;

/** "7A1" -> "8A1"; không có số khối ở đầu tên -> null */
function nextGradeName(name: string) {
  const m = name.match(/^(\d+)(.*)$/);
  return m ? { grade: Number(m[1]) + 1, name: `${Number(m[1]) + 1}${m[2]}` } : null;
}

const LAST_GRADE = 9; // THCS: lớp 6 đến lớp 9

/**
 * Tạo các lớp của năm học mới từ các lớp năm học trước: giữ GVCN, số tổ; tùy chọn lên khối
 * (7A1 -> 8A1, lớp 9 bỏ qua) và chuyển học sinh đang học sang lớp mới (dùng lại tài khoản).
 * Tổ và tổ trưởng của năm mới GVCN chọn lại ở thẻ Tổ.
 */
export async function copyClassesAction(yearId: string, _prev: CopyClassesState, formData: FormData): Promise<CopyClassesState> {
  const user = await requireUser(["ADMIN"]);
  const target = await prisma.schoolYear.findUnique({ where: { id: yearId } });
  const source = await prisma.schoolYear.findUnique({ where: { name: String(formData.get("fromYear") ?? "") } });
  if (!target || !source || source.id === target.id) return { error: "Vui lòng chọn năm học nguồn." };
  if (target.locked) return { error: `Năm học ${target.name} đã khóa.` };
  const bump = formData.get("bump") === "on";
  const withStudents = formData.get("withStudents") === "on";

  const classes = await prisma.classroom.findMany({ where: { schoolYear: source.name }, orderBy: { name: "asc" } });
  const details: string[] = [];
  let created = 0;
  let moved = 0;
  for (const c of classes) {
    let name = c.name;
    if (bump) {
      const next = nextGradeName(c.name);
      if (!next) {
        details.push(`${c.name}: tên lớp không bắt đầu bằng số khối, giữ nguyên tên.`);
      } else if (next.grade > LAST_GRADE) {
        details.push(`${c.name}: lớp cuối cấp, không tạo lớp mới.`);
        continue;
      } else {
        name = next.name;
      }
    }
    const exists = await prisma.classroom.findUnique({ where: { name_schoolYear: { name, schoolYear: target.name } } });
    const classroom =
      exists ??
      (await prisma.classroom.create({
        data: {
          name,
          schoolYear: target.name,
          homeroomTeacherId: c.homeroomTeacherId,
          groupCount: c.groupCount,
          baseScore: c.baseScore,
          ratingGood: c.ratingGood,
          ratingFair: c.ratingFair,
          ratingPass: c.ratingPass,
        },
      }));
    if (exists) details.push(`${name} (${target.name}) đã có, dùng lại lớp này.`);
    else created++;

    if (withStudents) {
      const students = await prisma.student.findMany({
        where: { status: "ACTIVE", enrollments: { some: { classId: c.id }, none: { schoolYear: target.name } } },
        select: { id: true },
      });
      // Cả lớp trong một lô lệnh (nhanh, không vượt thời gian khi lớp đông)
      if (students.length) {
        await prisma.$transaction(
          enrollManyOps(classroom, students.map((s) => s.id), { fromClassId: c.id, reason: "Lên lớp năm học mới", actorId: user.id }),
        );
      }
      moved += students.length;
    }
  }
  await audit(user, "year.copy-classes", {
    entity: "SchoolYear",
    entityId: yearId,
    summary: `Tạo ${created} lớp năm học ${target.name} từ năm học ${source.name}${withStudents ? `, chuyển ${moved} học sinh` : ""}`,
    detail: { details },
  });
  revalidatePath("/", "layout");
  return { ok: `Đã tạo ${created} lớp${withStudents ? ` và chuyển ${moved} học sinh` : ""} cho năm học ${target.name}.`, details };
}
