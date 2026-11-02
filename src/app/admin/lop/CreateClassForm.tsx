"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { createClassAction } from "./actions";

export function CreateClassForm({
  teachers,
  defaultYear,
}: {
  teachers: { id: string; fullName: string }[];
  defaultYear: string;
}) {
  const [state, action, pending] = useActionState(createClassAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <div>
        <label className="label">Tên lớp *</label>
        <input name="name" className="input" placeholder="vd: 10A1" required />
      </div>
      <div>
        <label className="label">Năm học *</label>
        <input name="schoolYear" className="input" defaultValue={defaultYear} required />
      </div>
      <div>
        <label className="label">GV chủ nhiệm</label>
        <select name="teacherId" className="input" defaultValue="">
          <option value="">— Chưa phân công —</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang tạo..." : "Tạo lớp"}
        </button>
      </div>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
