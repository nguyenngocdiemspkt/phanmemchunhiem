"use client";

import { useActionState, useEffect, useState, startTransition } from "react";
import { FormMessage } from "@/components/ui";
import { computePoints, MAX_TIMES, signed, type Counts, type Criterion } from "@/lib/scoring";
import { saveScoresAction } from "./actions";

/** GV xem số tự khai, bổ sung đã chấp nhận và chốt số lần của từng tiêu chí */
export function ScorePanel({
  surveyId,
  studentId,
  criteria,
  baseScore,
  self,
  fromReports,
  effective,
  hasResponse,
}: {
  surveyId: string;
  studentId: string;
  criteria: Criterion[];
  baseScore: number;
  self: Counts;
  fromReports: Counts;
  effective: Counts;
  hasResponse: boolean;
}) {
  const [state, action, pending] = useActionState(saveScoresAction.bind(null, surveyId, studentId), null);
  const [counts, setCounts] = useState<Counts>(effective);
  // Số liệu trên server đổi (lưu điểm, chấp nhận bổ sung...) thì cập nhật lại ô nhập, giữ nguyên thông báo
  const effectiveKey = JSON.stringify(effective);
  useEffect(() => setCounts(JSON.parse(effectiveKey)), [effectiveKey]);
  const total = computePoints(baseScore, criteria, counts);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-3"
    >
      {!hasResponse && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Học sinh chưa nộp phiếu. Thầy/cô có thể chấm thay rồi duyệt.</p>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Tiêu chí</th>
              <th className="text-center">Tự khai</th>
              <th className="text-center">Tổ trưởng</th>
              <th className="text-center">Chốt</th>
              <th className="text-right">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((c) => (
              <tr key={c.id}>
                <td>
                  {c.name} <span className={`text-xs ${c.points > 0 ? "text-emerald-700" : "text-red-600"}`}>({signed(c.points)})</span>
                </td>
                <td className="text-center tabular-nums">{self[c.id] ?? 0}</td>
                <td className="text-center tabular-nums">{fromReports[c.id] ? `+${fromReports[c.id]}` : ""}</td>
                <td className="text-center">
                  <input
                    type="number"
                    name={`t_${c.id}`}
                    min={0}
                    max={MAX_TIMES}
                    aria-label={`Chốt số lần: ${c.name}`}
                    className={`input w-16 py-1 text-center ${(counts[c.id] ?? 0) !== (self[c.id] ?? 0) + (fromReports[c.id] ?? 0) ? "border-amber-400 bg-amber-50" : ""}`}
                    value={counts[c.id] ?? 0}
                    onChange={(e) => setCounts({ ...counts, [c.id]: Math.max(0, Math.min(MAX_TIMES, Number(e.target.value) || 0)) })}
                  />
                </td>
                <td className="text-right tabular-nums">{counts[c.id] ? signed(counts[c.id] * c.points) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm">
          Điểm gốc {baseScore} → <b className="text-lg text-teal-800">{total} điểm</b>
        </span>
        <button className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Đang lưu..." : hasResponse ? "Lưu điểm" : "Chấm thay"}
        </button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}
