import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { buildStudentExport } from "@/lib/excel";
import { removeDiacritics } from "@/lib/format";
import { byVietnameseName, STUDENT_STATUS } from "@/lib/students";

/** Xuất danh sách học sinh của lớp ra Excel (chỉ GVCN của lớp và quản trị) */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || user.role === "STUDENT") return new Response("Unauthorized", { status: 401 });
  const classroom = await prisma.classroom.findUnique({ where: { id } });
  if (!classroom || (user.role === "TEACHER" && classroom.homeroomTeacherId !== user.id)) {
    return new Response("Not found", { status: 404 });
  }

  const students = await prisma.student.findMany({
    where: { classId: id },
    include: { user: { select: { fullName: true, username: true } } },
  });
  // Đang học trước, rồi theo tên
  students.sort(
    (a, b) => Number(a.status !== "ACTIVE") - Number(b.status !== "ACTIVE") || byVietnameseName((s: (typeof students)[number]) => s.user.fullName)(a, b),
  );
  const buffer = await buildStudentExport(
    `Lớp ${classroom.name}`,
    students.map((s) => ({ ...s, fullName: s.user.fullName, username: s.user.username, status: STUDENT_STATUS[s.status].label })),
  );
  await audit(user, "student.export", {
    entity: "Classroom",
    entityId: id,
    classId: id,
    summary: `Xuất danh sách ${students.length} học sinh lớp ${classroom.name} ra Excel`,
  });
  const filename = `danh-sach-${removeDiacritics(classroom.name).replace(/[^a-z0-9]+/g, "")}-${classroom.schoolYear}.xlsx`;
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
