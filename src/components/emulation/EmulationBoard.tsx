import Link from "next/link";
import { addDays, fmtDate, fmtShortDate, toDateInput, weekStart } from "@/lib/format";
import { GROUP_COLORS, monitorCanEdit, type EmulationBoardData, type EmulationLevel, type GroupStanding } from "@/lib/emulation";
import { deleteRecordAction, toggleGroupAwardAction } from "@/lib/emulationActions";
import { LineChartCard } from "@/components/LineChartCard";
import { SubmitButton } from "@/components/SubmitButton";
import { Empty } from "@/components/ui";
import { RecordForm } from "./RecordForm";

const MEDAL = ["🥇", "🥈", "🥉"];

function Points({ value, className = "" }: { value: number; className?: string }) {
  const color = value > 0 ? "text-emerald-700" : value < 0 ? "text-red-600" : "text-slate-500";
  return <span className={`font-semibold tabular-nums ${color} ${className}`}>{value > 0 ? `+${value}` : value}</span>;
}

function RankTable({
  title,
  subtitle,
  rows,
  ownGroup,
  starPoints,
}: {
  title: string;
  subtitle: string;
  rows: GroupStanding[];
  ownGroup?: number | null;
  starPoints: number;
}) {
  const anyPoints = rows.some((r) => r.plus || r.minus || r.sheetCount || r.stars || r.deeds);
  return (
    <div className="card overflow-x-auto">
      <h2 className="font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-slate-500">{subtitle}</p>
      <table className="table">
        <thead>
          <tr>
            <th className="w-16">Hạng</th>
            <th>Tổ</th>
            <th className="text-right" title="Tổng điểm các phiếu tuần đã duyệt của thành viên">Phiếu tuần</th>
            <th className="text-right" title="Điểm phiếu việc tốt đã duyệt (người làm và người được hỗ trợ)">Việc tốt</th>
            <th className="text-right" title="Điểm GV/cán sự ghi trực tiếp">Ghi thêm</th>
            <th className="text-right" title={`Sao từ tiêu chí xếp hạng tổ, 1 sao = ${starPoints} điểm`}>Sao</th>
            <th className="text-right">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.groupNo} className={r.groupNo === ownGroup ? "bg-teal-50" : ""}>
              <td className="text-lg">{anyPoints && r.rank <= 3 ? MEDAL[r.rank - 1] : <span className="text-sm text-slate-500">{r.rank}</span>}</td>
              <td>
                <span className="font-medium">{r.name}</span>
                {r.groupNo === ownGroup && <span className="ml-1 text-xs text-teal-700">(tổ em)</span>}
                <div className="text-xs text-slate-500">{r.members} học sinh</div>
                {r.hits.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.hits.map((h, i) => (
                      <span
                        key={i}
                        className={`rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset ${h.stars > 0 ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-red-50 text-red-700 ring-red-200"}`}
                      >
                        {h.stars > 0 ? "★" : "✕"} {h.name} ({h.stars > 0 ? "+" : ""}
                        {h.stars})
                      </span>
                    ))}
                  </div>
                )}
              </td>
              <td className="text-right tabular-nums">
                {r.sheetCount ? (
                  <>
                    <span className="font-semibold">{r.sheets}</span>
                    <div className="text-xs text-slate-500">{r.sheetCount} phiếu</div>
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="text-right">{r.deeds ? <Points value={r.deeds} /> : <span className="text-slate-400">—</span>}</td>
              <td className="text-right">
                {r.plus || r.minus ? <Points value={r.plus + r.minus} /> : <span className="text-slate-400">—</span>}
              </td>
              <td className="text-right tabular-nums">
                {r.stars ? (
                  <>
                    <span className={`font-semibold ${r.stars > 0 ? "text-amber-600" : "text-red-600"}`}>★ {r.stars}</span>
                    <div className="text-xs text-slate-500">
                      {r.starScore > 0 ? "+" : ""}
                      {r.starScore} điểm
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="text-right text-base font-bold tabular-nums">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmulationBoard({
  classId,
  groupCount,
  data,
  week,
  level,
  userId,
  basePath,
  ownGroup,
}: {
  classId: string;
  groupCount: number;
  data: EmulationBoardData;
  week: { start: Date; end: Date };
  level: EmulationLevel;
  userId: string;
  basePath: string;
  ownGroup?: number | null;
}) {
  const now = new Date();
  const thisWeek = weekStart(now);
  const isThisWeek = week.start.getTime() === thisWeek.getTime();
  const weekHref = (d: Date) => `${basePath}?tuan=${toDateInput(d)}`;
  const canWrite = level === "teacher" || (level === "monitor" && isThisWeek);
  const unassigned = data.students.filter((s) => !s.groupNo).length;
  // Học sinh thường chỉ xem chi tiết của tổ mình
  const records = level === "viewer" ? data.records.filter((r) => r.groupNo === ownGroup) : data.records;

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <Link href={weekHref(addDays(week.start, -7))} className="btn-secondary btn-sm">
          ← Tuần trước
        </Link>
        <div className="text-center">
          <div className="font-semibold">
            Tuần {fmtShortDate(week.start)} – {fmtDate(addDays(week.end, -1))}
          </div>
          {isThisWeek ? (
            <div className="text-xs text-teal-700">Tuần này</div>
          ) : (
            <Link href={basePath} className="link text-xs">
              Về tuần này
            </Link>
          )}
        </div>
        {isThisWeek ? (
          <span className="btn-secondary btn-sm invisible">Tuần sau →</span>
        ) : (
          <Link href={weekHref(week.end)} className="btn-secondary btn-sm">
            Tuần sau →
          </Link>
        )}
      </div>

      {level === "teacher" && unassigned > 0 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Còn {unassigned} học sinh chưa được phân tổ.{" "}
          <Link href={`/gv/lop/${classId}/thi-dua/cai-dat`} className="font-medium underline">
            Phân tổ ngay
          </Link>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <RankTable
          title="Xếp hạng tuần"
          subtitle={`Điểm phiếu tuần đã duyệt của các thành viên + điểm ghi thêm + sao (1 sao = ${data.starPoints} điểm) trong tuần đang xem`}
          rows={data.weekly}
          ownGroup={ownGroup}
          starPoints={data.starPoints}
        />
        <RankTable title="Xếp hạng cả năm" subtitle="Cộng dồn tất cả các tuần" rows={data.overall} ownGroup={ownGroup} starPoints={data.starPoints} />
      </div>

      {level === "teacher" && data.manualCriteria.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="mb-1 font-semibold">Tiêu chí chấm tay tuần này</h2>
          <p className="mb-3 text-xs text-slate-500">Bấm vào ô để tick / bỏ tick cho tổ đạt tiêu chí trong tuần đang xem.</p>
          <table className="table">
            <thead>
              <tr>
                <th>Tiêu chí</th>
                {data.groupNames.map((g) => (
                  <th key={g} className="text-center">
                    {g}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.manualCriteria.map((c) => (
                <tr key={c.id}>
                  <td>
                    {c.name}{" "}
                    <span className={c.stars > 0 ? "text-amber-600" : "text-red-600"}>
                      ({c.stars > 0 ? "+" : ""}
                      {c.stars} sao)
                    </span>
                  </td>
                  {data.groupNames.map((g, i) => {
                    const on = data.weekAwards.some((a) => a.criterionId === c.id && a.groupNo === i + 1);
                    return (
                      <td key={g} className="text-center">
                        <form action={toggleGroupAwardAction.bind(null, classId, c.id, i + 1, week.start.toISOString())}>
                          <SubmitButton
                            className={on ? "btn-primary btn-sm" : "btn-secondary btn-sm"}
                            pendingText="..."
                          >
                            {on ? "★ Đạt" : "Chưa"}
                          </SubmitButton>
                        </form>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Ghi điểm thi đua</h2>
          <RecordForm
            classId={classId}
            groupCount={groupCount}
            students={data.students}
            categories={data.categories}
            today={toDateInput(now)}
            minDate={level === "monitor" ? toDateInput(thisWeek) : undefined}
          />
          {level === "monitor" && (
            <p className="mt-3 text-xs text-slate-500">
              Cán sự ghi được điểm cho các ngày trong tuần này và xóa được điểm do mình ghi. Ghi nhầm ở tuần trước thì báo thầy/cô sửa.
            </p>
          )}
        </div>
      )}

      <div className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">
          {level === "viewer" ? `Chi tiết tổ ${ownGroup ?? ""} trong tuần` : "Chi tiết ghi điểm trong tuần"}
        </h2>
        {level === "viewer" && !ownGroup ? (
          <Empty>Em chưa được xếp vào tổ nào.</Empty>
        ) : records.length === 0 ? (
          <Empty>Chưa có ghi nhận nào trong tuần này.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Tổ</th>
                <th>Học sinh</th>
                <th>Nội dung</th>
                <th className="text-right">Điểm</th>
                <th>Người ghi</th>
                {level !== "viewer" && <th></th>}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const canDelete = level === "teacher" || (level === "monitor" && r.authorId === userId && monitorCanEdit(r.date, now));
                return (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap">{fmtShortDate(r.date)}</td>
                    <td>{r.groupNo}</td>
                    <td>{r.student?.user.fullName ?? <span className="text-slate-500">Cả tổ</span>}</td>
                    <td>{r.content}</td>
                    <td className="text-right">
                      <Points value={r.points} />
                    </td>
                    <td className="text-xs text-slate-500">{r.author?.fullName ?? ""}</td>
                    {level !== "viewer" && (
                      <td>
                        {canDelete && (
                          <form action={deleteRecordAction.bind(null, classId, r.id)}>
                            <SubmitButton className="btn-danger btn-sm" pendingText="..." confirm={`Xóa ghi nhận "${r.content}"?`}>
                              Xóa
                            </SubmitButton>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Điểm từng tuần của các tổ</h2>
        <LineChartCard
          data={data.hasChartData ? data.chart : []}
          series={Array.from({ length: groupCount }, (_, i) => ({
            key: `g${i + 1}`,
            name: data.groupNames[i] ?? `Tổ ${i + 1}`,
            color: GROUP_COLORS[i % GROUP_COLORS.length],
          }))}
          domain={["auto", "auto"]}
          unit=" điểm"
        />
      </div>
    </div>
  );
}
