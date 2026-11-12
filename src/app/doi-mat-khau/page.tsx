import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await requireUser(undefined, { allowMustChange: true });
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Đổi mật khẩu</h1>
          <p className="mt-1 text-sm text-slate-500">
            {user.mustChangePassword
              ? `Chào ${user.fullName}, em/thầy/cô đang dùng mật khẩu được cấp. Nên đổi sang mật khẩu riêng để giữ an toàn tài khoản.`
              : user.fullName}
          </p>
        </div>
        <div className="card">
          <ChangePasswordForm />
        </div>
        <p className="mt-4 text-center text-sm">
          <Link href="/" className="link">
            {user.mustChangePassword ? "Để sau, vào trang chính →" : "← Quay lại"}
          </Link>
        </p>
      </div>
    </div>
  );
}
