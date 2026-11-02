import Link from "next/link";
import type { Role } from "@/lib/session";
import { logoutAction } from "@/app/actions";
import { NavLinks } from "./NavLinks";

const NAV: Record<Role, { href: string; label: string }[]> = {
  ADMIN: [
    { href: "/admin", label: "Tổng quan" },
    { href: "/admin/giao-vien", label: "Giáo viên" },
    { href: "/admin/lop", label: "Lớp học" },
    { href: "/gv/mau-phieu", label: "Mẫu phiếu" },
  ],
  TEACHER: [
    { href: "/gv", label: "Lớp chủ nhiệm" },
    { href: "/gv/mau-phieu", label: "Mẫu phiếu" },
  ],
  STUDENT: [
    { href: "/hs", label: "Trang chính" },
    { href: "/hs/hanh-trinh", label: "Hành trình" },
    { href: "/hs/ca-nhan", label: "Cá nhân" },
  ],
};

const ROLE_LABEL: Record<Role, string> = { ADMIN: "Quản trị", TEACHER: "Giáo viên", STUDENT: "Học sinh" };

export function AppShell({
  user,
  children,
}: {
  user: { fullName: string; role: Role };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="text-lg font-bold text-teal-800">
            Sổ chủ nhiệm
          </Link>
          <NavLinks items={NAV[user.role]} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-right sm:block">
              <span className="block font-medium leading-tight">{user.fullName}</span>
              <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
            </span>
            <Link href="/doi-mat-khau" className="btn-secondary btn-sm">
              Đổi mật khẩu
            </Link>
            <form action={logoutAction}>
              <button className="btn-secondary btn-sm">Đăng xuất</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
