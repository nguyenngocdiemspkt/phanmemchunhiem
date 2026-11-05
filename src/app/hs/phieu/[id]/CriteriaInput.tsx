"use client";

import { useState } from "react";
import { computePoints, MAX_TIMES, signed, type Counts, type Criterion } from "@/lib/scoring";

/** Phần chấm điểm theo tiêu chí trong phiếu tuần: học sinh khai số lần, tổng điểm hiện ngay. */
export function CriteriaInput({
  criteria,
  baseScore,
  initial,
  readOnly,
}: {
  criteria: Criterion[];
  baseScore: number;
  initial: Counts;
  readOnly: boolean;
}) {
  const [counts, setCounts] = useState<Counts>(initial);
  const total = computePoints(baseScore, criteria, counts);
  const plus = criteria.filter((c) => c.points > 0);
  const minus = criteria.filter((c) => c.points < 0);

  const row = (c: Criterion) => (
    <div key={c.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2 text-sm">
      <span>
        {c.name} <span className={c.points > 0 ? "text-emerald-700" : "text-red-600"}>({signed(c.points)}/lần)</span>
      </span>
      <input
        type="number"
        name={`c_${c.id}`}
        min={0}
        max={MAX_TIMES}
        inputMode="numeric"
        aria-label={`Số lần: ${c.name}`}
        className="input w-20 text-center"
        value={counts[c.id] ?? ""}
        placeholder="0"
        disabled={readOnly}
        onChange={(e) => setCounts({ ...counts, [c.id]: Math.max(0, Math.min(MAX_TIMES, Number(e.target.value) || 0)) })}
      />
      <span className="w-12 text-right tabular-nums text-slate-600">{counts[c.id] ? signed(counts[c.id] * c.points) : ""}</span>
    </div>
  );

  return (
    <div className="card">
      <div className="mb-1 font-medium text-slate-900">Tự chấm điểm thi đua tuần này</div>
      <p className="mb-3 text-xs text-slate-500">
        Điểm gốc {baseScore}. Em ghi số lần mình đã làm được (hoặc mắc phải) trong tuần. Hãy khai trung thực, thầy/cô và tổ trưởng sẽ
        cùng xem lại.
      </p>
      {plus.length > 0 && (
        <div className="divide-y divide-slate-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Điểm cộng</div>
          {plus.map(row)}
        </div>
      )}
      {minus.length > 0 && (
        <div className="mt-3 divide-y divide-slate-100">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-600">Điểm trừ</div>
          {minus.map(row)}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-sm">
        <span>Điểm tự chấm của em</span>
        <b className="text-lg tabular-nums text-teal-800">{total}</b>
      </div>
    </div>
  );
}
