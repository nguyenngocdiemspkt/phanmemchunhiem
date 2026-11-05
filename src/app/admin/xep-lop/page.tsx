import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { byVietnameseName, STUDENT_STATUS } from "@/lib/students";
import { Empty, PageHeader } from "@/components/ui";
import { PromoteForm } from "./PromoteForm";

export default async function PromotePage({ searchParams }: { searchParams: Promise<{ tu?: string }> }) {
  await requireUser(["ADMIN"]);
  const { tu } = await searchParams;
  const classes = await prisma.classroom.findMany({
    orderBy: [{ schoolYear: "desc" }, { name: "asc" }],
    include: { year: { select: { locked: true } }, _count: { select: { enrollments: true } } },
  });
  const source = classes.find((c) => c.id === tu);
  // Lớp đích: lớp chưa khóa thuộc năm học sau năm học của lớp nguồn
  const targets = source
    ? classes.filter((c) => !c.year.locked && c.schoolYear > source.schoolYear).map((c) => ({ id: c.id, label: `${c.name} (${c.schoolYear})` }))
    : [];
  const students = source
    ? await prisma.student.findMany({
        where: { enrollments: { some: { classId: source.id } } },
        include: {
          user: { select: { fullName: true } },
          enrollments: {
            where: { schoolYear: { gt: source.schoolYear } },
            include: { classroom: { select: { name: true } } },
            orderBy: { schoolYear: "asc" },
          },
        },
      })
    : [];
  students.sort(byVietnameseName((s) => s.user.fullName));

  return (
    <>
      <PageHeader
        title="Xếp lớp năm học mới"
        subtitle="Đưa học sinh của một lớp năm trước vào lớp của năm học mới. Học sinh dùng lại tài khoản cũ, lịch sử đánh giá được giữ nguyên. Mỗi học sinh chỉ thuộc 1 lớp trong 1 năm học."
      />
      <form className="card mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-64">
          <label className="label">Lớp nguồn</label>
          <select name="tu" defaultValue={tu ?? ""} className="input">
            <option value="" disabled>
              — Chọn lớp —
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.schoolYear}) · {c._count.enrollments} HS
              </option>
            ))}
          </select>
        </div>
        <button className="btn-secondary">Xem học sinh</button>
      </form>

      {source &&
        (targets.length === 0 ? (
          <Empty>Chưa có lớp nào thuộc năm học sau {source.schoolYear}. Hãy tạo năm học và lớp mới trước.</Empty>
        ) : students.length === 0 ? (
          <Empty>Lớp {source.name} chưa có học sinh.</Empty>
        ) : (
          <div className="card">
            <PromoteForm
              key={source.id}
              fromClassId={source.id}
              targets={targets}
              students={students.map((s) => ({
                id: s.id,
                name: s.user.fullName,
                code: s.studentCode,
                active: s.status === "ACTIVE",
                status: STUDENT_STATUS[s.status].label,
                laterClass: s.enrollments.map((e) => `${e.classroom.name} (${e.schoolYear})`).join(", ") || null,
              }))}
            />
          </div>
        ))}
    </>
  );
}
