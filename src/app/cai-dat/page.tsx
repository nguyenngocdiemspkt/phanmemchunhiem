import Link from "next/link";
import { prisma } from "@/lib/db";
import { SetupForm } from "./SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const installed = (await prisma.user.count({ where: { role: "ADMIN" } })) > 0;
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-slate-900">Cài đặt lần đầu</h1>
        <p className="mb-6 text-center text-sm text-slate-500">Tạo tài khoản quản trị đầu tiên của hệ thống</p>
        <div className="card">
          {installed ? (
            <p className="text-sm">
              Hệ thống đã có tài khoản quản trị.{" "}
              <Link href="/dang-nhap" className="link">
                Đến trang đăng nhập
              </Link>
            </p>
          ) : !process.env.SETUP_KEY ? (
            <p className="text-sm text-red-700">
              Chưa cấu hình biến môi trường <code>SETUP_KEY</code>. Hãy thêm biến này trên Vercel rồi triển khai lại.
            </p>
          ) : (
            <SetupForm />
          )}
        </div>
      </div>
    </div>
  );
}
