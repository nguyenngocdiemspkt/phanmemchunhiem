"use client";

import { useActionState, useState } from "react";
import { addRecordAction } from "@/lib/emulationActions";
import { FormMessage } from "@/components/ui";

type Props = {
  classId: string;
  groupCount: number;
  students: { id: string; name: string; groupNo: number | null }[];
  categories: { id: string; name: string; points: number }[];
  today: string;
  minDate?: string;
};

const fmtPoints = (p: number) => (p > 0 ? `+${p}` : String(p));

export function RecordForm({ classId, groupCount, students, categories, today, minDate }: Props) {
  const [state, action, pending] = useActionState(addRecordAction.bind(null, classId), null);
  const [categoryId, setCategoryId] = useState("");
  const custom = categoryId === "custom";
  const groups = Array.from({ length: groupCount }, (_, i) => i + 1);
  const plus = categories.filter((c) => c.points > 0);
  const minus = categories.filter((c) => c.points < 0);

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_1fr]">
        <div>
          <label className="label">Ngày</label>
          <input name="date" type="date" className="input" defaultValue={today} min={minDate} max={today} required />
        </div>
        <div>
          <label className="label">Ghi cho</label>
          <select name="target" className="input" required defaultValue="">
            <option value="" disabled>
              — Chọn tổ hoặc học sinh —
            </option>
            <optgroup label="Cả tổ">
              {groups.map((g) => (
                <option key={g} value={`g:${g}`}>
                  Cả tổ {g}
                </option>
              ))}
            </optgroup>
            {groups.map((g) => {
              const members = students.filter((s) => s.groupNo === g);
              if (!members.length) return null;
              return (
                <optgroup key={g} label={`Học sinh tổ ${g}`}>
                  {members.map((s) => (
                    <option key={s.id} value={`s:${s.id}`}>
                      {s.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>
        <div>
          <label className="label">Nội dung</label>
          <select name="categoryId" className="input" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="" disabled>
              — Chọn nội dung —
            </option>
            <optgroup label="Điểm cộng">
              {plus.map((c) => (
                <option key={c.id} value={c.id}>
                  {fmtPoints(c.points)} · {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Điểm trừ">
              {minus.map((c) => (
                <option key={c.id} value={c.id}>
                  {fmtPoints(c.points)} · {c.name}
                </option>
              ))}
            </optgroup>
            <option value="custom">Nội dung khác (tự nhập)…</option>
          </select>
        </div>
      </div>
      <div className={custom ? "grid gap-3 sm:grid-cols-[1fr_8rem]" : ""}>
        <div>
          <label className="label">{custom ? "Nội dung" : "Ghi chú thêm (không bắt buộc)"}</label>
          <input
            name="note"
            className="input"
            required={custom}
            placeholder={custom ? "vd: Đạt giải Nhì văn nghệ" : "vd: tiết Toán thứ Ba"}
          />
        </div>
        {custom && (
          <div>
            <label className="label">Điểm (+/−)</label>
            <input name="points" type="number" step={1} min={-100} max={100} className="input" required placeholder="vd: 5 hoặc -2" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Ghi điểm"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
