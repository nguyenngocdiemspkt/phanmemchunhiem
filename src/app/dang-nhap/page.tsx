import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 to-slate-100 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-teal-800">Class Master</h1>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700/70">Hệ thống quản lý lớp chủ nhiệm</p>
          <p className="mt-1 text-sm text-slate-500">Đăng nhập bằng tài khoản nhà trường cấp</p>
        </div>
        <div className="card">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
