import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { Badge, Empty } from "@/components/ui";
import { ResetPasswordButton, ToggleActiveButton } from "@/components/AccountButtons";
import { AddStudentForm, ImportStudentsForm } from "./StudentForms";

// Nhập file Excel lớn cần thêm thời gian xử lý
export const maxDuration = 60;

export default async function ClassStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { classroom } = await requireClassAccess(id);
  const students = await prisma.student.findMany({
    where: { classId: id },
    include: { user: { select: { id: true, fullName: true, username: true, active: true, mustChangePassword: true } } },
    orderBy: { user: { fullName: "asc" } },
  });
  // Sắp xếp theo tên (từ cuối) như sổ điểm Việt Nam
  const lastWord = (s: string) => s.trim().split(/\s+/).at(-1) ?? s;
  students.sort(
    (a, b) =>
      lastWord(a.user.fullName).localeCompare(lastWord(b.user.fullName), "vi") ||
      a.user.fullName.localeCompare(b.user.fullName, "vi"),
  );

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="mb-1 font-semibold">Nhập danh sách từ Excel</h2>
        <p className="mb-3 text-sm text-slate-500">
          File .xlsx có cột <b>Họ và tên</b> (bắt buộc); các cột tùy chọn: Mã học sinh, Ngày sinh, Giới tính, Họ tên phụ huynh, SĐT
          phụ huynh, Tên đăng nhập, Mật khẩu.
        </p>
        <ImportStudentsForm classId={id} className={classroom.name} />
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold">+ Thêm một học sinh</summary>
        <div className="mt-4">
          <AddStudentForm classId={id} className={classroom.name} />
        </div>
      </details>

      {students.length === 0 ? (
        <Empty>Lớp chưa có học sinh.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">STT</th>
                <th>Họ và tên</th>
                <th>Mã HS</th>
                <th>Ngày sinh</th>
                <th>Tên đăng nhập</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className={s.user.active ? "" : "opacity-60"}>
                  <td>{i + 1}</td>
                  <td>
                    <Link href={`/gv/hoc-sinh/${s.id}`} className="link">
                      {s.user.fullName}
                    </Link>
                    <div className="mt-0.5 flex gap-1">
                      {!s.user.active && <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Đã khóa</Badge>}
                      {s.user.mustChangePassword && s.user.active && (
                        <Badge className="bg-slate-50 text-slate-500 ring-slate-200">Chưa đăng nhập lần đầu</Badge>
                      )}
                    </div>
                  </td>
                  <td>{s.studentCode ?? ""}</td>
                  <td>{s.dateOfBirth ?? ""}</td>
                  <td className="font-mono text-xs">{s.user.username}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <ResetPasswordButton userId={s.user.id} name={s.user.fullName} />
                      <ToggleActiveButton userId={s.user.id} active={s.user.active} name={s.user.fullName} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
