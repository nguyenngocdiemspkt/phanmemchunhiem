import Link from "next/link";
import { prisma } from "@/lib/db";
import { Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { CreateClassForm } from "./CreateClassForm";
import { deleteClassAction, updateClassAction } from "./actions";

function currentSchoolYear() {
  const now = new Date();
  const y = now.getFullYear();
  // Năm học bắt đầu từ tháng 8
  return now.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

export default async function ClassesPage() {
  const [classes, teachers] = await Promise.all([
    prisma.classroom.findMany({
      orderBy: [{ schoolYear: "desc" }, { name: "asc" }],
      include: { _count: { select: { students: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ["TEACHER", "ADMIN"] }, active: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Lớp học" subtitle="Tạo lớp và phân công giáo viên chủ nhiệm" />

      <div className="card mb-6">
        <h2 className="mb-3 font-semibold">Tạo lớp mới</h2>
        <CreateClassForm teachers={teachers} defaultYear={currentSchoolYear()} />
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
                return (
                  <tr key={c.id}>
                    <td>
                      <form id={formId} action={updateClassAction.bind(null, c.id)} />
                      <input form={formId} name="name" defaultValue={c.name} className="input w-28" required />
                    </td>
                    <td>
                      <input form={formId} name="schoolYear" defaultValue={c.schoolYear} className="input w-32" required />
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
                        {c._count.students === 0 && (
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
