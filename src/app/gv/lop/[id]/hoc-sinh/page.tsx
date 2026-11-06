import Link from "next/link";
import type { StudentStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { removeDiacritics } from "@/lib/format";
import { classLockedMessage } from "@/lib/schoolYear";
import { byVietnameseName, parseStatus, STUDENT_STATUS } from "@/lib/students";
import { Badge, Empty } from "@/components/ui";
import { DeleteStudentButton, ResetPasswordButton, ToggleActiveButton } from "@/components/AccountButtons";
import { AddStudentForm, ImportStudentsForm } from "./StudentForms";
import { BatchBar, SelectAll } from "./BatchBar";
import { BATCH_FORM_ID } from "./batch";

// Nhập file Excel lớn cần thêm thời gian xử lý
export const maxDuration = 60;

type Filters = { q?: string; to?: string; tt?: string };

export default async function ClassStudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Filters>;
}) {
  const { id } = await params;
  const filters = await searchParams;
  const { user, classroom } = await requireClassAccess(id);
  const locked = await classLockedMessage(classroom);

  // Học sinh hiện học lớp này + học sinh từng được xếp vào lớp này (đã lên lớp / chuyển lớp)
  const roster = await prisma.student.findMany({
    where: { OR: [{ classId: id }, { enrollments: { some: { classId: id } } }] },
    include: {
      user: { select: { id: true, fullName: true, username: true, active: true, mustChangePassword: true } },
      classroom: { select: { name: true, schoolYear: true } },
    },
  });
  roster.sort(byVietnameseName((s) => s.user.fullName));
  const all = roster.filter((s) => s.classId === id);
  // Đã lên lớp năm sau: vẫn là học sinh của lớp trong năm học này. Chuyển lớp trong cùng năm: chỉ hiện khi xem tất cả.
  const movedOn = roster.filter((s) => s.classId !== id && (s.classroom.schoolYear !== classroom.schoolYear || filters.tt === "all"));

  // Mặc định chỉ hiện học sinh đang học; tt=all để xem tất cả
  const status: StudentStatus | "all" = filters.tt === "all" ? "all" : (parseStatus(filters.tt) ?? "ACTIVE");
  const q = removeDiacritics(filters.q?.trim() ?? "");
  const students = all.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (!filters.to || (filters.to === "chua" ? s.groupNo == null : s.groupNo === Number(filters.to))) &&
      (!q || removeDiacritics([s.user.fullName, s.studentCode ?? "", s.user.username, s.parentPhone ?? ""].join(" ")).includes(q)),
  );
  const counts = Object.fromEntries(
    (Object.keys(STUDENT_STATUS) as StudentStatus[]).map((k) => [k, all.filter((s) => s.status === k).length]),
  ) as Record<StudentStatus, number>;

  return (
    <div className="space-y-6">
      {locked ? (
        <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{locked}</p>
      ) : (
        <>
          <div className="card">
            <h2 className="mb-1 font-semibold">Nhập danh sách từ Excel</h2>
            <p className="mb-3 text-sm text-slate-500">
              File .xlsx có cột <b>Họ và tên</b> (bắt buộc); các cột tùy chọn: Mã học sinh, Ngày sinh, Giới tính, Tổ, Họ tên phụ huynh, SĐT
              phụ huynh, Địa chỉ, Ghi chú, Tên đăng nhập, Mật khẩu. Nhập lại file có mã học sinh đã có trong lớp sẽ cập nhật thông tin của em đó
              (giữ nguyên tài khoản, mật khẩu); mã đang thuộc lớp khác cùng năm học sẽ bị bỏ qua.
            </p>
            <ImportStudentsForm classId={id} className={classroom.name} />
          </div>

          <details className="card">
            <summary className="cursor-pointer font-semibold">+ Thêm một học sinh</summary>
            <div className="mt-4">
              <AddStudentForm classId={id} className={classroom.name} groupCount={classroom.groupCount} />
            </div>
          </details>
        </>
      )}

      <div className="card space-y-3">
        <form className="flex flex-wrap items-end gap-2">
          <div className="min-w-56 flex-1">
            <label className="label">Tìm kiếm</label>
            <input name="q" defaultValue={filters.q ?? ""} className="input" placeholder="Tên, mã HS, tên đăng nhập, SĐT phụ huynh..." />
          </div>
          <div>
            <label className="label">Tổ</label>
            <select name="to" defaultValue={filters.to ?? ""} className="input">
              <option value="">Tất cả</option>
              {Array.from({ length: classroom.groupCount }, (_, i) => (
                <option key={i} value={i + 1}>
                  Tổ {i + 1}
                </option>
              ))}
              <option value="chua">Chưa phân tổ</option>
            </select>
          </div>
          <div>
            <label className="label">Trạng thái</label>
            <select name="tt" defaultValue={status} className="input">
              {(Object.keys(STUDENT_STATUS) as StudentStatus[]).map((k) => (
                <option key={k} value={k}>
                  {STUDENT_STATUS[k].label} ({counts[k]})
                </option>
              ))}
              <option value="all">Tất cả ({all.length})</option>
            </select>
          </div>
          <button className="btn-secondary">Lọc</button>
          <a href={`/api/lop/${id}/hoc-sinh`} className="btn-secondary ml-auto">
            Xuất Excel
          </a>
        </form>
      </div>

      {movedOn.length > 0 && (
        <details className="card" open={all.length === 0}>
          <summary className="cursor-pointer font-semibold">
            Học sinh của lớp đã lên lớp / chuyển lớp ({movedOn.length})
          </summary>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {movedOn.map((s) => (
              <li key={s.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {user.role === "ADMIN" ? (
                    <Link href={`/gv/hoc-sinh/${s.id}`} className="link">
                      {s.user.fullName}
                    </Link>
                  ) : (
                    s.user.fullName
                  )}{" "}
                  <span className="text-slate-500">{s.studentCode ?? ""}</span>
                </span>
                <span className="text-slate-600">
                  Hiện học lớp {s.classroom.name} ({s.classroom.schoolYear})
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {students.length === 0 ? (
        <Empty>{all.length === 0 ? "Lớp hiện không có học sinh." : "Không có học sinh phù hợp bộ lọc."}</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          {!locked && <BatchBar classId={id} groupCount={classroom.groupCount} />}
          <table className="table">
            <thead>
              <tr>
                {!locked && (
                  <th className="w-8">
                    <SelectAll />
                  </th>
                )}
                <th className="w-10">STT</th>
                <th>Họ và tên</th>
                <th>Mã HS</th>
                <th>Ngày sinh</th>
                <th>Tổ</th>
                <th>Tên đăng nhập</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s.id} className={s.user.active ? "" : "opacity-60"}>
                  {!locked && (
                    <td>
                      <input type="checkbox" name="ids" value={s.id} form={BATCH_FORM_ID} aria-label={`Chọn ${s.user.fullName}`} />
                    </td>
                  )}
                  <td>{i + 1}</td>
                  <td>
                    <Link href={`/gv/hoc-sinh/${s.id}`} className="link">
                      {s.user.fullName}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {s.status !== "ACTIVE" && <Badge className={STUDENT_STATUS[s.status].style}>{STUDENT_STATUS[s.status].label}</Badge>}
                      {s.status === "ACTIVE" && !s.user.active && <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Đã khóa</Badge>}
                      {s.user.mustChangePassword && s.user.active && (
                        <Badge className="bg-slate-50 text-slate-500 ring-slate-200">Chưa đăng nhập lần đầu</Badge>
                      )}
                    </div>
                    {s.note && <div className="mt-0.5 text-xs text-slate-500">{s.note}</div>}
                  </td>
                  <td>{s.studentCode ?? ""}</td>
                  <td>{s.dateOfBirth ?? ""}</td>
                  <td>{s.groupNo ?? ""}</td>
                  <td className="font-mono text-xs">{s.user.username}</td>
                  <td>
                    {!locked && (
                      <div className="flex flex-wrap gap-1">
                        <ResetPasswordButton userId={s.user.id} name={s.user.fullName} />
                        {s.status === "ACTIVE" && <ToggleActiveButton userId={s.user.id} active={s.user.active} name={s.user.fullName} />}
                        <DeleteStudentButton userId={s.user.id} name={s.user.fullName} />
                      </div>
                    )}
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
