"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_PAGES } from "./_pages";

export function DocsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Tài liệu theo vai trò" className="flex gap-1 overflow-x-auto md:flex-col">
      {DOC_PAGES.map(([href, label]) => {
        const active = path === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm ${active ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
