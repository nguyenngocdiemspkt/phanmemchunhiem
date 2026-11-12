import { percent } from "@/lib/format";
import { ProgressBar } from "./ui";

/** Kết quả bình chọn theo từng lựa chọn. names: chỉ truyền khi giáo viên xem (học sinh chỉ thấy số lượng). */
export function PollResults({
  options,
  total,
  mine,
  names,
}: {
  options: { id: string; text: string; count: number }[];
  total: number;
  mine?: string | null;
  names?: Map<string, string[]>;
}) {
  return (
    <ul className="space-y-3" data-testid="poll-results">
      {options.map((o) => {
        const p = percent(o.count, total);
        return (
          <li key={o.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className={o.id === mine ? "font-semibold text-teal-800" : ""}>
                {o.text}
                {o.id === mine && " (em chọn)"}
              </span>
              <span className="tabular-nums text-slate-600">
                {o.count} phiếu · {p}%
              </span>
            </div>
            <ProgressBar value={p} />
            {names && (
              <p className="mt-1 text-xs text-slate-600">{names.get(o.id)?.join(", ") || <span className="text-slate-400">Chưa có ai</span>}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
