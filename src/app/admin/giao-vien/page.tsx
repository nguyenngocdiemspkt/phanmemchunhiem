import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Badge, PageHeader } from "@/components/ui";
import { ResetPasswordButton, ToggleActiveButton } from "@/components/AccountButtons";
import { CreateTeacherForm } from "./CreateTeacherForm";

export default async function TeachersPage() {
  const me = await requireUser(["ADMIN"]);
  const users = await prisma.user.findMany({
    where: { role: { in: ["TEACHER", "ADMIN"] } },
    orderBy: [{ role: "desc" }, { fullName: "asc" }],
    include: { homeroomClasses: { select: { name: true, schoolYear: true }, orderBy: { name: "asc" } } },
  });

  return (
    <>
      <PageHeader title="Giáo viên & quản trị" subtitle={`${users.length} tài khoản`} />

      <details className="card mb-6">
        <summary className="cursor-pointer font-semibold">+ Thêm tài khoản giáo viên</summary>
        <div className="mt-4">
          <CreateTeacherForm />
        </div>
      </details>

      <div className="card overflow-x-auto p-0 sm:p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Họ tên</th>
              <th>Tên đăng nhập</th>
              <th>Liên hệ</th>
              <th>Lớp chủ nhiệm</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                <td>
                  <div className="font-medium">{u.fullName}</div>
                  <div className="mt-0.5 flex gap-1">
                    {u.role === "ADMIN" && <Badge className="bg-violet-50 text-violet-800 ring-violet-200">Quản trị</Badge>}
                    {!u.active && <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Đã khóa</Badge>}
                  </div>
                </td>
                <td className="font-mono text-xs">{u.username}</td>
                <td className="text-xs text-slate-600">
                  {u.phone && <div>{u.phone}</div>}
                  {u.email && <div>{u.email}</div>}
                </td>
                <td>{u.homeroomClasses.map((c) => `${c.name} (${c.schoolYear})`).join(", ") || "—"}</td>
                <td>
                  {u.id !== me.id && (
                    <div className="flex flex-wrap gap-1">
                      <ResetPasswordButton userId={u.id} name={u.fullName} />
                      <ToggleActiveButton userId={u.id} active={u.active} name={u.fullName} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
