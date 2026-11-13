"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { addGroupAction, addMembersAction } from "@/lib/groupActions";

export function AddGroupForm({ classId, nextNo }: { classId: string; nextNo: number }) {
  const [state, action, pending] = useActionState(addGroupAction.bind(null, classId), null);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label">Tên tổ mới (không bắt buộc)</label>
        <input name="name" className="input" placeholder={`Tổ ${nextNo}`} maxLength={60} />
      </div>
      <button className="btn-primary" disabled={pending}>
        {pending ? "Đang tạo..." : "+ Tạo tổ"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

/** Chọn các học sinh chưa phân tổ để đưa vào tổ (em đã ở tổ khác không hiện ở đây) */
export function AddMembersForm({
  classId,
  groupNo,
  candidates,
}: {
  classId: string;
  groupNo: number;
  candidates: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(addMembersAction.bind(null, classId, groupNo), null);
  if (candidates.length === 0)
    return (
      <div className="mt-3 space-y-1">
        <FormMessage state={state} />
        <p className="text-xs text-slate-400">Không còn học sinh chưa có tổ.</p>
      </div>
    );
  return (
    <details className="mt-3">
      <summary className="btn-secondary btn-sm list-none">+ Thêm học sinh</summary>
      <form action={action} className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {candidates.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="ids" value={c.id} />
              {c.name}
            </label>
          ))}
        </div>
        <button className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Đang thêm..." : "Thêm vào tổ"}
        </button>
        <FormMessage state={state} />
      </form>
    </details>
  );
}
