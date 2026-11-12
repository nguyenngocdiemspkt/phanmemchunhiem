"use client";

import { useActionState } from "react";
import { deleteStudentAction, resetClassPasswordsAction, resetPasswordAction, toggleActiveAction } from "@/lib/accountActions";
import { FormMessage } from "./ui";
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

export function DeleteStudentButton({ userId, name }: { userId: string; name: string }) {
  return (
    <form action={deleteStudentAction.bind(null, userId)} className="inline">
      <SubmitButton
        className="btn-danger btn-sm"
        pendingText="..."
        confirm={`Xóa vĩnh viễn tài khoản ${name}?\n\nToàn bộ phiếu đã nộp, nhận xét và ghi chú của học sinh này sẽ bị xóa khỏi hệ thống (bản chụp được lưu trong Nhật ký thao tác).\nNếu học sinh nghỉ học hoặc chuyển trường, hãy đổi trạng thái thay vì xóa.`}
      >
        Xóa
      </SubmitButton>
    </form>
  );
}

export function ClassPasswordForm({ classId, className, count }: { classId: string; className: string; count: number }) {
  const [state, action, pending] = useActionState(resetClassPasswordsAction.bind(null, classId), null);
  return (
    <form
      action={action}
      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
      onSubmit={(e) => {
        if (!confirm(`Đặt mật khẩu này cho tất cả ${count} học sinh đang học của lớp ${className}? Mật khẩu cũ của các em sẽ không dùng được nữa.`)) {
          e.preventDefault();
        }
      }}
    >
      <div>
        <label className="label">Mật khẩu chung mới</label>
        <input name="password" type="text" minLength={6} className="input font-mono" autoComplete="off" required />
      </div>
      <div>
        <label className="label">Nhập lại mật khẩu</label>
        <input name="confirm" type="text" minLength={6} className="input font-mono" autoComplete="off" required />
      </div>
      <div className="flex items-end">
        <button className="btn-danger" disabled={pending || count === 0}>
          {pending ? "Đang đặt lại..." : `Áp dụng cho ${count} học sinh`}
        </button>
      </div>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
