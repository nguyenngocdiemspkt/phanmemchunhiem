"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui";
import { createYearAction } from "./actions";

/** Ngày gợi ý: 05/09, HK II 12/01, kết thúc 31/05 */
function datesFor(name: string) {
  const m = name.trim().match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;
  const y1 = Number(m[1]);
  return { startDate: `${y1}-09-05`, semester2Start: `${y1 + 1}-01-12`, endDate: `${y1 + 1}-05-31` };
}

export function CreateYearForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(createYearAction, null);
  const [name, setName] = useState(defaultName);
  const dates = datesFor(name);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-5">
      <div>
        <label className="label">Năm học *</label>
        <input name="name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="2026-2027" required />
      </div>
      {/* key theo năm để ngày gợi ý đổi theo tên năm học vừa nhập */}
      <div key={`s-${dates?.startDate}`}>
        <label className="label">Ngày khai giảng *</label>
        <input name="startDate" type="date" className="input" defaultValue={dates?.startDate} required />
      </div>
      <div key={`h-${dates?.semester2Start}`}>
        <label className="label">Bắt đầu học kỳ II *</label>
        <input name="semester2Start" type="date" className="input" defaultValue={dates?.semester2Start} required />
      </div>
      <div key={`e-${dates?.endDate}`}>
        <label className="label">Kết thúc năm học *</label>
        <input name="endDate" type="date" className="input" defaultValue={dates?.endDate} required />
      </div>
      <div className="flex flex-col justify-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isCurrent" defaultChecked /> Đặt làm năm hiện tại
        </label>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang tạo..." : "Tạo năm học"}
        </button>
      </div>
      <div className="sm:col-span-5">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
