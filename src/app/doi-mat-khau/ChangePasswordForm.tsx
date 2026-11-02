"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Mật khẩu hiện tại</label>
        <input name="current" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label">Mật khẩu mới (ít nhất 6 ký tự)</label>
        <input name="next" type="password" className="input" autoComplete="new-password" minLength={6} required />
      </div>
      <div>
        <label className="label">Nhập lại mật khẩu mới</label>
        <input name="confirm" type="password" className="input" autoComplete="new-password" minLength={6} required />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Đang lưu..." : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}
