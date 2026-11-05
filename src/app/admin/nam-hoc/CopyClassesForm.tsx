"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { copyClassesAction } from "./actions";

export function CopyClassesForm({ yearId, yearName, sources }: { yearId: string; yearName: string; sources: string[] }) {
  const [state, action, pending] = useActionState(copyClassesAction.bind(null, yearId), null);
  return (
    <details>
      <summary className="btn-secondary btn-sm list-none">Tạo lớp từ năm trước</summary>
      <form action={action} className="mt-2 w-80 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <div>
          <label className="label">Lấy các lớp của năm học</label>
          <select name="fromYear" className="input" defaultValue={sources[0]}>
            {sources.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="bump" defaultChecked className="mt-0.5" />
          <span>Lên khối (7A1 → 8A1), bỏ qua lớp 9</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="withStudents" defaultChecked className="mt-0.5" />
          <span>Chuyển luôn học sinh đang học sang lớp mới (dùng lại tài khoản)</span>
        </label>
        <p className="text-xs text-slate-500">
          GVCN cũ được giữ làm GVCN lớp mới (đổi lại ở mục Lớp học). Tổ và tổ trưởng năm {yearName} GVCN chọn lại ở thẻ Tổ.
        </p>
        <button className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Đang tạo..." : `Tạo lớp cho năm ${yearName}`}
        </button>
        <FormMessage state={state} />
        {state?.details && state.details.length > 0 && (
          <ul className="list-inside list-disc text-xs text-slate-600">
            {state.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
      </form>
    </details>
  );
}
