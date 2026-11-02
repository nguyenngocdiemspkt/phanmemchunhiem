"use client";

import { useActionState } from "react";
import { resetPasswordAction, toggleActiveAction } from "@/lib/accountActions";
import { SubmitButton } from "./SubmitButton";

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, userId), null);
  if (state?.password) {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900 ring-1 ring-amber-200">
        Mật khẩu mới: <b className="font-mono text-sm">{state.password}</b>
      </span>
    );
  }
  return (
    <form action={action} className="inline">
      <button
        className="btn-secondary btn-sm"
        disabled={pending}
        onClick={(e) => {
          if (!confirm(`Cấp lại mật khẩu cho ${name}?`)) e.preventDefault();
        }}
      >
        {pending ? "..." : "Cấp lại MK"}
      </button>
      {state?.error && <span className="ml-1 text-xs text-red-600">{state.error}</span>}
    </form>
  );
}

export function ToggleActiveButton({ userId, active, name }: { userId: string; active: boolean; name: string }) {
  return (
    <form action={toggleActiveAction.bind(null, userId)} className="inline">
      <SubmitButton
        className={active ? "btn-danger btn-sm" : "btn-secondary btn-sm"}
        pendingText="..."
        confirm={active ? `Khóa tài khoản ${name}? Người này sẽ không đăng nhập được.` : undefined}
      >
        {active ? "Khóa" : "Mở khóa"}
      </SubmitButton>
    </form>
  );
}
