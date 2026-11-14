"use client";

import { useActionState } from "react";
import { voteCommendationAction } from "@/lib/commendationActions";
import { submitKeep } from "@/lib/formSubmit";
import { FormMessage } from "./ui";

/** Học sinh bầu tuyên dương 1 bạn cho tuần này (đổi được đến hết Chủ nhật) */
export function CommendationVoteForm({
  classmates,
  current,
}: {
  classmates: { id: string; name: string }[];
  current: { nomineeId: string; reason: string | null } | null;
}) {
  const [state, action, pending] = useActionState(voteCommendationAction, null);
  return (
    <form onSubmit={submitKeep(action)} className="space-y-3" data-testid="commend-form">
      <div>
        <label className="label" htmlFor="nomineeId">
          Bạn em muốn tuyên dương tuần này *
        </label>
        <select id="nomineeId" name="nomineeId" className="input" defaultValue={current?.nomineeId ?? ""} required>
          <option value="" disabled>
            — Chọn một bạn —
          </option>
          {classmates.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="reason">
          Vì sao bạn xứng đáng được tuyên dương? (không bắt buộc)
        </label>
        <input
          id="reason"
          name="reason"
          className="input"
          maxLength={200}
          defaultValue={current?.reason ?? ""}
          placeholder="vd: Bạn giảng bài Toán cho cả tổ, luôn giúp đỡ mọi người"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang gửi..." : current ? "Đổi phiếu" : "Bầu tuyên dương"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
