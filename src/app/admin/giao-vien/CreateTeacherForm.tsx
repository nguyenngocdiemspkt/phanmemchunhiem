"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { createTeacherAction } from "./actions";

export function CreateTeacherForm() {
  const [state, action, pending] = useActionState(createTeacherAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Họ và tên *</label>
        <input name="fullName" className="input" required />
      </div>
      <div>
        <label className="label">Tên đăng nhập *</label>
        <input name="username" className="input" placeholder="vd: lan.nguyen" autoCapitalize="none" required />
      </div>
      <div>
        <label className="label">Số điện thoại</label>
        <input name="phone" className="input" />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" className="input" />
      </div>
      <div>
        <label className="label">Vai trò</label>
        <select name="role" className="input">
          <option value="TEACHER">Giáo viên</option>
          <option value="ADMIN">Quản trị</option>
        </select>
      </div>
      <div className="flex items-end">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang tạo..." : "Tạo tài khoản"}
        </button>
      </div>
      <div className="sm:col-span-2">
        <FormMessage state={state} />
        {state?.password && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Tên đăng nhập: <b className="font-mono">{state.username}</b> · Mật khẩu tạm: <b className="font-mono">{state.password}</b>
            <br />
            Hãy ghi lại và gửi cho giáo viên. Mật khẩu này chỉ hiển thị một lần; khi đăng nhập lần đầu sẽ phải đổi.
          </p>
        )}
      </div>
    </form>
  );
}
