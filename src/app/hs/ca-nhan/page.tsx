import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui";

export default async function StudentProfilePage() {
  const { user, student } = await requireStudent();
  const teacher = student.classroom.homeroomTeacherId
    ? await prisma.user.findUnique({ where: { id: student.classroom.homeroomTeacherId }, select: { fullName: true } })
    : null;

  const rows: [string, string | null | undefined][] = [
    ["Họ và tên", user.fullName],
    ["Tên đăng nhập", user.username],
    ["Mã học sinh", student.studentCode],
    ["Ngày sinh", student.dateOfBirth],
    ["Giới tính", student.gender],
    ["Lớp", `${student.classroom.name} (${student.classroom.schoolYear})`],
    ["GV chủ nhiệm", teacher?.fullName],
    ["Phụ huynh", student.parentName],
    ["SĐT phụ huynh", student.parentPhone],
    ["Địa chỉ", student.address],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Thông tin cá nhân" />
      <div className="card">
        <dl className="divide-y divide-slate-100">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[9rem_1fr] gap-2 py-2 text-sm">
              <dt className="text-slate-500">{k}</dt>
              <dd className="font-medium">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-slate-500">Nếu thông tin chưa đúng, em hãy báo giáo viên chủ nhiệm để chỉnh sửa.</p>
        <Link href="/doi-mat-khau" className="btn-secondary mt-4">
          Đổi mật khẩu
        </Link>
      </div>
    </div>
  );
}
