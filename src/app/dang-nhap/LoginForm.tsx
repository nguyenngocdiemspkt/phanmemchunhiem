"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="username">
          Tên đăng nhập
        </label>
        <input id="username" name="username" className="input" autoComplete="username" autoCapitalize="none" required />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Mật khẩu
        </label>
        <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Đang đăng nhập..." : "Đăng nhập"}
      </button>
      <p className="text-center text-xs text-slate-500">Quên mật khẩu? Hãy liên hệ giáo viên chủ nhiệm để được cấp lại.</p>
    </form>
  );
}
