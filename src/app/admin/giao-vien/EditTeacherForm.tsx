"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { updateTeacherAction } from "./actions";

export function EditTeacherForm({
  user,
}: {
  user: { id: string; fullName: string; phone: string | null; email: string | null; role: "ADMIN" | "TEACHER" | "STUDENT" };
}) {
  const [state, action, pending] = useActionState(updateTeacherAction.bind(null, user.id), null);
  return (
    <details>
      <summary className="btn-secondary btn-sm list-none">Sửa</summary>
      <form action={action} className="mt-2 grid w-72 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <input name="fullName" className="input" defaultValue={user.fullName} placeholder="Họ và tên" required />
        <input name="phone" className="input" defaultValue={user.phone ?? ""} placeholder="Số điện thoại" />
        <input name="email" type="email" className="input" defaultValue={user.email ?? ""} placeholder="Email" />
        <select name="role" className="input" defaultValue={user.role}>
          <option value="TEACHER">Giáo viên</option>
          <option value="ADMIN">Quản trị</option>
        </select>
        <button className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu"}
        </button>
        <FormMessage state={state} />
      </form>
    </details>
  );
}
