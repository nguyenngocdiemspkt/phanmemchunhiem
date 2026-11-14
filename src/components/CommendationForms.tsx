"use client";

import { useActionState, useState } from "react";
import { setCommendPointsAction, voteCommendationAction } from "@/lib/commendationActions";
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

/** GVCN đặt điểm cộng cho bạn được tuyên dương tuần */
export function CommendPointsForm({ classId, value }: { classId: string; value: number }) {
  const [state, action, pending] = useActionState(setCommendPointsAction.bind(null, classId), null);
  return (
    <form onSubmit={submitKeep(action)} className="flex flex-wrap items-end gap-2">
      <div>
        <label className="label" htmlFor="commendPoints">
          Điểm cộng cho bạn được tuyên dương tuần
        </label>
        <input id="commendPoints" name="commendPoints" type="number" min={0} max={50} defaultValue={value} className="input w-24" required />
      </div>
      <button className="btn-secondary" disabled={pending}>
        {pending ? "Đang lưu..." : "Lưu"}
      </button>
      <span className="text-xs text-slate-500">Cộng vào thi đua tổ và điểm vườn cây; 0 = không cộng.</span>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Ô văn bản soạn sẵn kèm nút sao chép (dán Zalo hoặc đọc trong giờ sinh hoạt) */
export function CopyText({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
            } catch {
              const ta = document.createElement("textarea");
              ta.value = text;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              ta.remove();
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "✓ Đã chép" : "📋 Sao chép"}
        </button>
      </div>
      <textarea readOnly value={text} rows={Math.min(10, text.split("\n").length + 1)} className="input font-normal text-sm" />
    </div>
  );
}
