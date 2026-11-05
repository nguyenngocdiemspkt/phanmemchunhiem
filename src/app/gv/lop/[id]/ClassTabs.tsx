"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui";

export function ClassTabs({ classId }: { classId: string }) {
  const pathname = usePathname();
  const base = `/gv/lop/${classId}`;
  const items = [
    { href: base, label: "Tổng quan" },
    { href: `${base}/hoc-sinh`, label: "Học sinh" },
    { href: `${base}/to`, label: "Tổ" },
    { href: `${base}/dot`, label: "Đợt tự đánh giá" },
    { href: `${base}/thi-dua`, label: "Thi đua tổ" },
  ];
  const active = items.find((i) => i.href !== base && pathname.startsWith(i.href))?.href ?? base;
  return <Tabs items={items} active={active} />;
}
