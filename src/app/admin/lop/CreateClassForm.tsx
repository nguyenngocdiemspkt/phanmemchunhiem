"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { createClassAction } from "./actions";

export function CreateClassForm({
  teachers,
  years,
  defaultYear,
}: {
  teachers: { id: string; fullName: string }[];
  years: string[];
  defaultYear?: string;
}) {
  const [state, action, pending] = useActionState(createClassAction, null);
  if (years.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Chưa có năm học đang mở.{" "}
        <Link href="/admin/nam-hoc" className="link">
          Tạo năm học
        </Link>{" "}
        trước khi tạo lớp.
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <div>
        <label className="label">Tên lớp *</label>
        <input name="name" className="input" placeholder="vd: 8A1" required />
      </div>
      <div>
        <label className="label">Năm học *</label>
        <select name="schoolYear" className="input" defaultValue={defaultYear} required>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
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
