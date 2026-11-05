"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { promoteStudentsAction } from "./actions";

type Row = { id: string; name: string; code: string | null; laterClass: string | null; active: boolean; status: string };

export function PromoteForm({
  fromClassId,
  targets,
  students,
}: {
  fromClassId: string;
  targets: { id: string; label: string }[];
  students: Row[];
}) {
  const [state, action, pending] = useActionState(promoteStudentsAction, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="fromClassId" value={fromClassId} />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56">
          <label className="label">Xếp vào lớp</label>
          <select name="toClassId" className="input" required defaultValue="">
            <option value="" disabled>
              — Chọn lớp đích —
            </option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang xếp lớp..." : "Xếp lớp các học sinh đã chọn"}
        </button>
      </div>
      <FormMessage state={state} />
      {state?.skipped && state.skipped.length > 0 && (
        <ul className="list-inside list-disc rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {state.skipped.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      )}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th className="w-8">
                <input
                  type="checkbox"
                  aria-label="Chọn tất cả"
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    e.currentTarget.form?.querySelectorAll<HTMLInputElement>("input[name=ids]").forEach((cb) => (cb.checked = checked));
                  }}
                />
              </th>
              <th>Họ và tên</th>
              <th>Mã HS</th>
              <th>Trạng thái</th>
              <th>Đã xếp lớp năm sau</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className={s.laterClass ? "opacity-60" : ""}>
                <td>
                  <input type="checkbox" name="ids" value={s.id} aria-label={`Chọn ${s.name}`} defaultChecked={!s.laterClass && s.active} />
                </td>
                <td>{s.name}</td>
                <td>{s.code ?? ""}</td>
                <td className="text-xs">{s.status}</td>
                <td className="text-xs text-slate-600">{s.laterClass ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
