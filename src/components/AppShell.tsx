import Link from "next/link";
import type { Role } from "@/lib/session";
import { logoutAction } from "@/app/actions";
import { NavLinks } from "./NavLinks";
import { Avatar } from "./Avatar";
import { PasswordReminder } from "./PasswordReminder";

const NAV: Record<Role, { href: string; label: string }[]> = {
  ADMIN: [
    { href: "/admin", label: "Tổng quan" },
    { href: "/admin/giao-vien", label: "Giáo viên" },
    { href: "/admin/nam-hoc", label: "Năm học" },
    { href: "/admin/lop", label: "Lớp học" },
    { href: "/admin/xep-lop", label: "Xếp lớp" },
    { href: "/admin/cau-hinh-vuon", label: "Cấu hình vườn" },
    { href: "/gv/mau-phieu", label: "Mẫu phiếu" },
    { href: "/admin/de-xuat", label: "Đề xuất" },
    { href: "/admin/nhat-ky", label: "Nhật ký" },
  ],
  TEACHER: [
    { href: "/gv", label: "Lớp chủ nhiệm" },
    { href: "/gv/mau-phieu", label: "Mẫu phiếu" },
  ],
  STUDENT: [
    { href: "/hs", label: "Trang chính" },
    { href: "/hs/hanh-trinh", label: "Hành trình" },
    { href: "/hs/vuon", label: "Vườn lớp" },
    { href: "/hs/viec-tot", label: "Việc tốt" },
    { href: "/hs/thi-dua", label: "Thi đua" },
    { href: "/hs/ca-nhan", label: "Cá nhân" },
    { href: "/hs/de-xuat", label: "Đề xuất" },
  ],
};

const ROLE_LABEL: Record<Role, string> = { ADMIN: "Quản trị", TEACHER: "Giáo viên", STUDENT: "Học sinh" };

export function AppShell({
  user,
  children,
}: {
  user: { id: string; fullName: string; role: Role; avatarUpdatedAt: Date | null; mustChangePassword: boolean };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="text-lg font-bold text-teal-800">
            Class Master
          </Link>
          <NavLinks items={NAV[user.role]} />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/tai-khoan" className="flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-slate-100" title="Tài khoản của tôi">
              <Avatar user={user} size={32} />
              <span className="hidden text-left sm:block">
                <span className="block font-medium leading-tight">{user.fullName}</span>
                <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
              </span>
            </Link>
            <form action={logoutAction}>
              <button className="btn-secondary btn-sm">Đăng xuất</button>
            </form>
          </div>
        </div>
      </header>
      {user.mustChangePassword && <PasswordReminder />}
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
