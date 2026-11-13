"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitKeep } from "@/lib/formSubmit";
import type { FeatureRequestStatus } from "@prisma/client";
import { createFeatureRequestAction, updateFeatureRequestAction } from "@/lib/featureRequestActions";
import { FormMessage } from "./ui";
import { FEATURE_STATUS } from "@/lib/featureRequests";


export function CreateFeatureRequestForm() {
  const [state, action, pending] = useActionState(createFeatureRequestAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <div>
        <label className="label">Tên chức năng *</label>
        <input name="title" className="input" maxLength={200} placeholder="vd: Nhắc em làm phiếu tự đánh giá vào tối thứ Sáu" required />
      </div>
      <div>
        <label className="label">Em mong muốn chức năng hoạt động thế nào? *</label>
        <textarea name="description" className="input min-h-28" maxLength={3000} placeholder="Chức năng giúp được gì cho em và các bạn? Em sẽ dùng nó ra sao?" required />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang gửi..." : "Gửi đề xuất"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function UpdateFeatureRequestForm({ id, status, adminNote }: { id: string; status: FeatureRequestStatus; adminNote: string | null }) {
  const [state, action, pending] = useActionState(updateFeatureRequestAction.bind(null, id), null);
  return (
    <form key={`${status}|${adminNote}`} onSubmit={submitKeep(action)} className="mt-3 flex flex-wrap items-end gap-2">
      <select name="status" defaultValue={status} className="input w-auto" aria-label="Trạng thái">
        {(Object.keys(FEATURE_STATUS) as FeatureRequestStatus[]).map((s) => (
          <option key={s} value={s}>
            {FEATURE_STATUS[s].label}
          </option>
        ))}
      </select>
      <input name="adminNote" defaultValue={adminNote ?? ""} className="input min-w-64 flex-1" placeholder="Phản hồi cho học sinh (không bắt buộc)" maxLength={2000} />
      <button className="btn-secondary btn-sm" disabled={pending}>
        {pending ? "..." : "Lưu"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
