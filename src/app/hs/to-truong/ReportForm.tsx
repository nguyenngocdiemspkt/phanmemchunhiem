"use client";

import { useActionState, useRef, useEffect, useState } from "react";
import { FormMessage } from "@/components/ui";
import { MAX_TIMES, signed, type Criterion } from "@/lib/scoring";
import { addReportAction } from "./actions";

export function ReportForm({ surveyId, studentId, criteria }: { surveyId: string; studentId: string; criteria: Criterion[] }) {
  const [state, action, pending] = useActionState(addReportAction.bind(null, surveyId, studentId), null);
  const [criterionId, setCriterionId] = useState(criteria.find((c) => c.points < 0)?.id ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="mt-2 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_5rem]">
      <select name="criterionId" className="input" value={criterionId} onChange={(e) => setCriterionId(e.target.value)}>
        <option value="">Chỉ nhận xét (không tính điểm)</option>
        {criteria.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({signed(c.points)}/lần)
          </option>
        ))}
      </select>
      <input
        name="times"
        type="number"
        min={1}
        max={MAX_TIMES}
        defaultValue={1}
        aria-label="Số lần"
        className="input text-center"
        disabled={!criterionId}
      />
      <textarea name="note" className="input min-h-16 sm:col-span-2" placeholder="Ghi rõ ngày, sự việc... (vd: Thứ Năm đi học trễ 10 phút)" maxLength={500} />
      <div className="flex items-center gap-2 sm:col-span-2">
        <button className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Đang gửi..." : "Gửi thầy/cô xác nhận"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
