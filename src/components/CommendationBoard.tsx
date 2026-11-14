import type { CommendationData, PeriodResult, WeekResult } from "@/lib/commendation";
import { Badge } from "./ui";

function Names({ list, meId, suffix }: { list: { studentId: string; name: string }[]; meId?: string | null; suffix: (i: number) => string }) {
  return (
    <span>
      {list.map((w, i) => (
        <span key={w.studentId}>
          {i > 0 && ", "}
          <span className={w.studentId === meId ? "font-semibold text-teal-800" : "font-medium"}>
            {w.studentId === meId ? `${w.name} (em)` : w.name}
          </span>
          <span className="text-xs text-slate-500"> {suffix(i)}</span>
        </span>
      ))}
    </span>
  );
}

function PeriodRow({ p, meId }: { p: PeriodResult; meId?: string | null }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 py-2">
      <span className="text-sm">
        <span className="font-medium">{p.label}</span>{" "}
        {p.done ? (
          <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-200">Đã chốt</Badge>
        ) : (
          <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Tạm tính · {p.weeksCounted} tuần</Badge>
        )}
      </span>
      <span className="text-sm">
        {p.winners.length ? (
          <>
            🏆 <Names list={p.winners} meId={meId} suffix={(i) => `(${p.winners[i].wins} lần tuyên dương tuần, ${p.winners[i].votes} phiếu)`} />
          </>
        ) : (
          <span className="text-slate-400">Chưa có</span>
        )}
      </span>
    </li>
  );
}

function WeekRow({ w, meId }: { w: WeekResult; meId?: string | null }) {
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 py-2">
      <span className="text-sm font-medium">Tuần {w.label}</span>
      <span className="text-sm">
        {w.winners.length ? (
          <>
            ⭐ <Names list={w.winners} meId={meId} suffix={(i) => `(${w.winners[i].votes}/${w.voters} phiếu)`} />
          </>
        ) : (
          <span className="text-slate-400">Không có phiếu</span>
        )}
      </span>
    </li>
  );
}

/**
 * Bảng vàng tuyên dương: tuần (đã chốt), tháng và học kỳ (tính từ số lần được tuyên dương tuần).
 */
export function CommendationBoard({ data, meId, weeksShown = 4 }: { data: CommendationData; meId?: string | null; weeksShown?: number }) {
  const doneWeeks = data.weeks.filter((w) => w.done).slice(0, weeksShown);
  return (
    <div className="grid gap-4 md:grid-cols-3" data-testid="commend-board">
      <div className="card">
        <h3 className="font-semibold">⭐ Tuyên dương tuần</h3>
        <p className="text-xs text-slate-500">Bạn nhiều phiếu nhất của mỗi tuần (công bố khi hết tuần).</p>
        {doneWeeks.length ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {doneWeeks.map((w) => (
              <WeekRow key={w.start.getTime()} w={w} meId={meId} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Chưa có tuần nào kết thúc.</p>
        )}
      </div>
      <div className="card">
        <h3 className="font-semibold">🏆 Tuyên dương tháng</h3>
        <p className="text-xs text-slate-500">Bạn được tuyên dương tuần nhiều lần nhất trong tháng; bằng nhau thì xét tổng số phiếu.</p>
        <ul className="mt-2 divide-y divide-slate-100">
          {data.months.slice(0, 3).map((m) => (
            <PeriodRow key={m.key} p={m} meId={meId} />
          ))}
        </ul>
      </div>
      <div className="card">
        <h3 className="font-semibold">🎖️ Tuyên dương học kỳ</h3>
        <p className="text-xs text-slate-500">Tính như tháng, cho cả học kỳ.</p>
        {data.semesters.length ? (
          <ul className="mt-2 divide-y divide-slate-100">
            {data.semesters.map((s) => (
              <PeriodRow key={s.key} p={s} meId={meId} />
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-400">Chưa có năm học.</p>
        )}
      </div>
    </div>
  );
}
