import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { currentSchoolYear } from "@/lib/schoolYear";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { CreateClassForm } from "./CreateClassForm";
import { ClassRow } from "./ClassRow";

export default async function ClassesPage({ searchParams }: { searchParams: Promise<{ nam?: string }> }) {
  await requireUser(["ADMIN"]);
  const { nam } = await searchParams;
  const [years, current, teachers] = await Promise.all([
    prisma.schoolYear.findMany({ orderBy: { name: "desc" } }),
    currentSchoolYear(),
    prisma.user.findMany({
      where: { role: { in: ["TEACHER", "ADMIN"] }, active: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);
  // Mặc định xem năm học hiện tại; "tat-ca" để xem mọi năm
  const yearFilter = nam === "tat-ca" ? undefined : (years.find((y) => y.name === nam) ?? current)?.name;
  const classes = await prisma.classroom.findMany({
    where: yearFilter ? { schoolYear: yearFilter } : undefined,
    orderBy: [{ schoolYear: "desc" }, { name: "asc" }],
    include: { year: { select: { locked: true } }, homeroomTeacher: { select: { fullName: true, active: true } }, _count: { select: { students: true, surveys: true, enrollments: true } } },
  });
  const openYears = years.filter((y) => !y.locked).map((y) => y.name);

  return (
    <>
      <PageHeader title="Lớp học" subtitle="Tạo lớp và phân công giáo viên chủ nhiệm" />

      <div className="card mb-6">
        <h2 className="mb-3 font-semibold">Tạo lớp mới</h2>
        <CreateClassForm teachers={teachers} years={openYears} defaultYear={current && !current.locked ? current.name : openYears[0]} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-500">Năm học:</span>
        {years.map((y) => (
          <Link
            key={y.id}
            href={`/admin/lop?nam=${y.name}`}
            className={`rounded-lg px-3 py-1 ${y.name === yearFilter ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {y.name}
          </Link>
        ))}
        <Link
          href="/admin/lop?nam=tat-ca"
          className={`rounded-lg px-3 py-1 ${!yearFilter ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}
        >
          Tất cả
        </Link>
      </div>

      {classes.length === 0 ? (
        <Empty>Chưa có lớp nào.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Tên lớp</th>
                <th>Năm học</th>
                <th>GV chủ nhiệm</th>
                <th>Sĩ số</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => {
                if (c.year.locked) {
                  return (
                    <tr key={c.id} className="opacity-70">
                      <td>{c.name}</td>
                      <td>
                        {c.schoolYear} <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Đã khóa</Badge>
                      </td>
                      <td>{c.homeroomTeacher?.fullName ?? "—"}</td>
                      <td>
                        <Link href={`/gv/lop/${c.id}/hoc-sinh`} className="link">
                          {c._count.students} HS
                        </Link>
                      </td>
                      <td></td>
                    </tr>
                  );
                }
                return (
                  <ClassRow
                    key={c.id}
                    id={c.id}
                    name={c.name}
                    schoolYear={c.schoolYear}
                    teacherId={c.homeroomTeacherId}
                    inactiveTeacher={c.homeroomTeacher && !c.homeroomTeacher.active ? c.homeroomTeacher.fullName : null}
                    studentCount={c._count.students}
                    surveyCount={c._count.surveys}
                    years={openYears}
                    teachers={teachers}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
