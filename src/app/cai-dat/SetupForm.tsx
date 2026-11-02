"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { setupAction } from "./actions";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Mã cài đặt (biến SETUP_KEY)</label>
        <input name="setupKey" type="password" className="input" required />
      </div>
      <div>
        <label className="label">Họ tên quản trị viên</label>
        <input name="fullName" className="input" required />
      </div>
      <div>
        <label className="label">Tên đăng nhập</label>
        <input name="username" className="input" autoCapitalize="none" required />
      </div>
      <div>
        <label className="label">Mật khẩu (ít nhất 8 ký tự)</label>
        <input name="password" type="password" className="input" minLength={8} required />
      </div>
      <FormMessage state={state} />
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Đang tạo..." : "Tạo tài khoản quản trị"}
      </button>
    </form>
  );
}
