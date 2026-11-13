import type { Metadata } from "next";
import Link from "next/link";
import { DocsNav } from "./DocsNav";

export const metadata: Metadata = {
  title: { default: "Hướng dẫn sử dụng – Class Master", template: "%s – Hướng dẫn Class Master" },
  description: "Hướng dẫn sử dụng Class Master cho quản trị, giáo viên chủ nhiệm, tổ trưởng và học sinh",
};

/** Tài liệu hướng dẫn: xem được không cần đăng nhập */
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/docs" className="text-lg font-bold text-teal-800">
            Class Master <span className="font-normal text-slate-500">· Hướng dẫn</span>
          </Link>
          <Link href="/" className="btn-primary btn-sm ml-auto">
            Vào hệ thống
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
        <aside className="min-w-0 md:sticky md:top-20 md:self-start">
          <DocsNav />
        </aside>
        <main className="min-w-0 max-w-3xl">{children}</main>
      </div>
    </div>
  );
}
