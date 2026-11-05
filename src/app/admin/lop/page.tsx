import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { currentSchoolYear } from "@/lib/schoolYear";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { CreateClassForm } from "./CreateClassForm";
import { deleteClassAction, updateClassAction } from "./actions";

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
    include: { year: { select: { locked: true } }, _count: { select: { students: true, surveys: true, enrollments: true } } },
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
                const formId = `class-${c.id}`;
                if (c.year.locked) {
                  return (
                    <tr key={c.id} className="opacity-70">
                      <td>{c.name}</td>
                      <td>
                        {c.schoolYear} <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Đã khóa</Badge>
                      </td>
                      <td>{teachers.find((t) => t.id === c.homeroomTeacherId)?.fullName ?? "—"}</td>
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
                  <tr key={c.id}>
                    <td>
                      <form id={formId} action={updateClassAction.bind(null, c.id)} />
                      <input form={formId} name="name" defaultValue={c.name} className="input w-28" required />
                    </td>
                    <td>
                      <select form={formId} name="schoolYear" defaultValue={c.schoolYear} className="input w-32">
                        {openYears.map((y) => (
                          <option key={y}>{y}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select form={formId} name="teacherId" defaultValue={c.homeroomTeacherId ?? ""} className="input min-w-44">
                        <option value="">— Chưa phân công —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.fullName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <Link href={`/gv/lop/${c.id}/hoc-sinh`} className="link">
                        {c._count.students} HS
                      </Link>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button form={formId} className="btn-secondary btn-sm">
                          Lưu
                        </button>
                        {c._count.students === 0 && c._count.surveys === 0 && c._count.enrollments === 0 && (
                          <form action={deleteClassAction.bind(null, c.id)}>
                            <SubmitButton className="btn-danger btn-sm" pendingText="..." confirm={`Xóa lớp ${c.name}?`}>
                              Xóa
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
