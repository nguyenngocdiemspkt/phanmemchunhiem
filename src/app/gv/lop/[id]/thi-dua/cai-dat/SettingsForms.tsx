"use client";

import { useActionState, useState, startTransition } from "react";
import { saveCategoriesAction, saveGroupsAction } from "@/lib/emulationActions";
import { FormMessage } from "@/components/ui";

const MAX_GROUPS = 12;

type StudentRow = { id: string; name: string; active: boolean; groupNo: number | null; isMonitor: boolean };

// Gửi bằng onSubmit + startTransition để React không tự xóa trắng form sau khi lưu
function submitWithoutReset(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}

export function GroupsForm({ classId, groupCount, students }: { classId: string; groupCount: number; students: StudentRow[] }) {
  const [state, action, pending] = useActionState(saveGroupsAction.bind(null, classId), null);
  const [count, setCount] = useState(groupCount);
  const [groups, setGroups] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.groupNo])),
  );
  const [monitors, setMonitors] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(students.map((s) => [s.id, s.isMonitor])),
  );

  // Chia lần lượt theo danh sách: mỗi tổ một khối liên tiếp, số em chênh nhau tối đa 1
  function autoAssign() {
    if (!confirm(`Chia lại toàn bộ học sinh đều vào ${count} tổ theo thứ tự danh sách?`)) return;
    const active = students.filter((s) => s.active);
    const size = Math.ceil(active.length / count);
    setGroups(Object.fromEntries(active.map((s, i) => [s.id, Math.floor(i / size) + 1])));
  }

  const perGroup = Array.from({ length: count }, (_, i) => students.filter((s) => groups[s.id] === i + 1).length);

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Số tổ</label>
          <input
            name="groupCount"
            type="number"
            min={1}
            max={MAX_GROUPS}
            className="input w-24"
            value={count}
            onChange={(e) => setCount(Math.min(MAX_GROUPS, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>
        <button type="button" className="btn-secondary" onClick={autoAssign}>
          Chia đều tự động
        </button>
        <div className="text-sm text-slate-500">
          {perGroup.map((n, i) => `Tổ ${i + 1}: ${n}`).join(" · ")}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">STT</th>
              <th>Họ và tên</th>
              <th className="w-36">Tổ</th>
              <th className="w-28 text-center">Cán sự</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const g = groups[s.id];
              return (
                <tr key={s.id} className={s.active ? "" : "opacity-60"}>
                  <td>{i + 1}</td>
                  <td>
                    {s.name}
                    {!s.active && <span className="ml-1 text-xs text-slate-500">(đã khóa)</span>}
                  </td>
                  <td>
                    <select
                      name={`group_${s.id}`}
                      className="input py-1"
                      value={g && g <= count ? g : ""}
                      onChange={(e) => setGroups({ ...groups, [s.id]: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">— Chưa phân —</option>
                      {Array.from({ length: count }, (_, k) => (
                        <option key={k} value={k + 1}>
                          Tổ {k + 1}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-center">
                    <input
                      type="checkbox"
                      name={`monitor_${s.id}`}
                      className="size-4"
                      checked={!!monitors[s.id]}
                      onChange={(e) => setMonitors({ ...monitors, [s.id]: e.target.checked })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu phân tổ"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

type Category = { name: string; points: number | "" };

export function CategoryEditor({ classId, initial }: { classId: string; initial: { name: string; points: number }[] }) {
  const [state, action, pending] = useActionState(saveCategoriesAction.bind(null, classId), null);
  const [rows, setRows] = useState<Category[]>(initial);

  const update = (i: number, patch: Partial<Category>) => setRows(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  };

  return (
    <form onSubmit={submitWithoutReset(action)} className="space-y-3">
      <input type="hidden" name="categories" value={JSON.stringify(rows)} />
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="input"
              value={r.name}
              placeholder="Tên nội dung, vd: Đi học trễ"
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <input
              type="number"
              step={1}
              className={`input w-24 text-right font-semibold ${Number(r.points) > 0 ? "text-emerald-700" : Number(r.points) < 0 ? "text-red-600" : ""}`}
              value={r.points}
              placeholder="±điểm"
              onChange={(e) => update(i, { points: e.target.value === "" ? "" : Number(e.target.value) })}
            />
            <button type="button" className="btn-secondary btn-sm" onClick={() => move(i, -1)} title="Lên">
              ↑
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={() => move(i, 1)} title="Xuống">
              ↓
            </button>
            <button type="button" className="btn-danger btn-sm" onClick={() => setRows(rows.filter((_, k) => k !== i))}>
              Xóa
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-secondary" onClick={() => setRows([...rows, { name: "", points: "" }])}>
          + Thêm nội dung
        </button>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu danh mục"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
