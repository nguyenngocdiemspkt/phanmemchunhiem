import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toDateInput } from "@/lib/format";
import { suggestedYearName, weekNumber } from "@/lib/schoolYear";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { CreateYearForm } from "./CreateYearForm";
import { CopyClassesForm } from "./CopyClassesForm";
import { deleteYearAction, setCurrentYearAction, toggleYearLockAction, updateYearAction } from "./actions";

export default async function SchoolYearsPage() {
  await requireUser(["ADMIN"]);
  const years = await prisma.schoolYear.findMany({
    orderBy: { name: "desc" },
    include: { _count: { select: { classes: true } } },
  });
  const now = new Date();
  const taken = new Set(years.map((y) => y.name));
  let suggested = suggestedYearName(now);
  if (taken.has(suggested)) {
    const y1 = Number(suggested.slice(0, 4)) + 1;
    suggested = `${y1}-${y1 + 1}`;
  }

  return (
    <>
      <PageHeader
        title="Năm học"
        subtitle="Mốc thời gian dùng để đánh số tuần học, chia học kỳ và tổng hợp báo cáo. Năm học đã khóa chỉ còn xem được."
      />

      <div className="card mb-6">
        <h2 className="mb-3 font-semibold">Tạo năm học mới</h2>
        <CreateYearForm defaultName={suggested} />
      </div>

      {years.length === 0 ? (
        <Empty>Chưa có năm học nào. Hãy tạo năm học trước khi tạo lớp.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Năm học</th>
                <th>Khai giảng</th>
                <th>Bắt đầu HK II</th>
                <th>Kết thúc</th>
                <th>Lớp</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => {
                const formId = `year-${y.id}`;
                const week = now <= y.endDate ? weekNumber(y, now) : null;
                return (
                  <tr key={y.id} className={y.locked ? "opacity-70" : ""}>
                    <td>
                      <form id={formId} action={updateYearAction.bind(null, y.id)} />
                      <div className="font-medium">{y.name}</div>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {y.isCurrent && <Badge className="bg-teal-50 text-teal-800 ring-teal-200">Hiện tại</Badge>}
                        {y.locked && <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Đã khóa</Badge>}
                        {week && <Badge className="bg-sky-50 text-sky-800 ring-sky-200">Tuần {week}</Badge>}
                      </div>
                    </td>
                    <td>
                      <input form={formId} name="startDate" type="date" className="input w-40" defaultValue={toDateInput(y.startDate)} required />
                    </td>
                    <td>
                      <input
                        form={formId}
                        name="semester2Start"
                        type="date"
                        className="input w-40"
                        defaultValue={toDateInput(y.semester2Start)}
                        required
                      />
                    </td>
                    <td>
                      <input form={formId} name="endDate" type="date" className="input w-40" defaultValue={toDateInput(y.endDate)} required />
                    </td>
                    <td>{y._count.classes}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button form={formId} className="btn-secondary btn-sm">
                          Lưu
                        </button>
                        {!y.locked && years.some((o) => o.name < y.name && o._count.classes > 0) && (
                          <CopyClassesForm
                            yearId={y.id}
                            yearName={y.name}
                            sources={years.filter((o) => o.name < y.name && o._count.classes > 0).map((o) => o.name)}
                          />
                        )}
                        {!y.isCurrent && (
                          <form action={setCurrentYearAction.bind(null, y.id)}>
                            <SubmitButton className="btn-secondary btn-sm" pendingText="...">
                              Đặt hiện tại
                            </SubmitButton>
                          </form>
                        )}
                        <form action={toggleYearLockAction.bind(null, y.id)}>
                          <SubmitButton
                            className={y.locked ? "btn-secondary btn-sm" : "btn-danger btn-sm"}
                            pendingText="..."
                            confirm={
                              y.locked
                                ? undefined
                                : `Khóa năm học ${y.name}? Giáo viên sẽ không thêm/sửa học sinh của các lớp năm học này được nữa (vẫn xem được).`
                            }
                          >
                            {y.locked ? "Mở khóa" : "Khóa"}
                          </SubmitButton>
                        </form>
                        {y._count.classes === 0 && (
                          <form action={deleteYearAction.bind(null, y.id)}>
                            <SubmitButton className="btn-danger btn-sm" pendingText="..." confirm={`Xóa năm học ${y.name}?`}>
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
