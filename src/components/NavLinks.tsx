"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  // Mục khớp dài nhất là mục đang chọn (tránh "/gv" sáng cùng "/gv/mau-phieu")
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav className="order-last flex w-full gap-1 overflow-x-auto text-sm sm:order-none sm:w-auto">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-medium ${
            i.href === active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
