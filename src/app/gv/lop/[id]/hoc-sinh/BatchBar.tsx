"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { batchStudentsAction } from "./actions";
import { BATCH_FORM_ID } from "./batch";



/** Thanh thao tác hàng loạt; các ô chọn học sinh trong bảng gắn vào form này qua thuộc tính form= */
export function BatchBar({ classId, groupCount }: { classId: string; groupCount: number }) {
  const [state, action, pending] = useActionState(batchStudentsAction.bind(null, classId), null);
  return (
    <form id={BATCH_FORM_ID} action={action} className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
      <span className="text-sm text-slate-600">Với các học sinh đã chọn:</span>
      <select name="op" className="input w-auto" defaultValue="" required>
        <option value="" disabled>
          — Chọn thao tác —
        </option>
        <optgroup label="Phân tổ">
          {Array.from({ length: groupCount }, (_, i) => (
            <option key={i} value={`group:${i + 1}`}>
              Chuyển vào tổ {i + 1}
            </option>
          ))}
          <option value="group:none">Bỏ phân tổ</option>
        </optgroup>
        <optgroup label="Trạng thái">
          <option value="status:ACTIVE">Đang học (mở tài khoản)</option>
          <option value="status:TRANSFERRED">Chuyển trường (khóa tài khoản)</option>
          <option value="status:LEFT">Nghỉ học (khóa tài khoản)</option>
        </optgroup>
      </select>
      <button
        className="btn-primary btn-sm"
        disabled={pending}
        onClick={(e) => {
          const op = (e.currentTarget.form?.elements.namedItem("op") as HTMLSelectElement | null)?.value ?? "";
          if (op.startsWith("status:") && op !== "status:ACTIVE" && !confirm("Học sinh sẽ không đăng nhập được nữa. Hồ sơ và phiếu cũ vẫn được giữ. Tiếp tục?")) {
            e.preventDefault();
          }
        }}
      >
        {pending ? "Đang cập nhật..." : "Áp dụng"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Chọn tất cả"
      onChange={(e) => {
        document
          .querySelectorAll<HTMLInputElement>(`input[type=checkbox][name=ids][form=${BATCH_FORM_ID}]`)
          .forEach((cb) => (cb.checked = e.currentTarget.checked));
      }}
    />
  );
}
