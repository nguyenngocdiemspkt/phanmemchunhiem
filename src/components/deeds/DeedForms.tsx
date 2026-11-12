"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createDeedAction, reviewDeedAction } from "@/lib/deedActions";
import { FormMessage } from "@/components/ui";

/** Học sinh tạo phiếu việc tốt */
export function CreateDeedForm({ classmates, today }: { classmates: { id: string; name: string }[]; today: string }) {
  const [state, action, pending] = useActionState(createDeedAction, null);
  const [kind, setKind] = useState<"ONCE" | "CHALLENGE">("ONCE");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <div>
        <label className="label">Việc tốt *</label>
        <input name="title" className="input" maxLength={200} placeholder="vd: Nhặt được ví tiền, nộp cho nhà trường trả lại bạn" required />
      </div>
      <div>
        <label className="label">Mô tả thêm</label>
        <textarea name="description" className="input min-h-20" maxLength={2000} placeholder="Ở đâu, khi nào, em đã làm gì..." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className="label">Loại phiếu</span>
          <div className="space-y-1.5 text-sm">
            <label className="flex items-start gap-2">
              <input type="radio" name="kind" value="ONCE" checked={kind === "ONCE"} onChange={() => setKind("ONCE")} className="mt-0.5" />
              <span>
                <b>Một lần, áp dụng ngay</b>
                <span className="block text-xs text-slate-500">Việc em đã làm xong, gửi thầy/cô xác nhận</span>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="kind" value="CHALLENGE" checked={kind === "CHALLENGE"} onChange={() => setKind("CHALLENGE")} className="mt-0.5" />
              <span>
                <b>Thử thách có thời hạn</b>
                <span className="block text-xs text-slate-500">vd: Kèm bạn học tốt môn Toán trong 4 tuần</span>
              </span>
            </label>
          </div>
        </div>
        <div className="space-y-3">
          {kind === "CHALLENGE" && (
            <div>
              <label className="label">Hạn hoàn thành *</label>
              <input name="deadline" type="date" min={today} className="input" required />
            </div>
          )}
          <div>
            <label className="label">Bạn được hỗ trợ (nếu có)</label>
            <select name="beneficiaryId" className="input" defaultValue="">
              <option value="">Không có</option>
              {classmates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang gửi..." : "Tạo phiếu việc tốt"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** GVCN duyệt phiếu việc tốt: cho điểm tùy trường hợp, hoặc không duyệt */
export function ReviewDeedForm({ deedId, beneficiaryName }: { deedId: string; beneficiaryName: string | null }) {
  const [state, action, pending] = useActionState(reviewDeedAction.bind(null, deedId), null);
  return (
    <form action={action} className="mt-3 grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[8rem_8rem_1fr]">
      <div>
        <label className="label text-xs">Điểm người làm</label>
        <input name="authorPoints" type="number" min={0} max={100} className="input" placeholder="vd: 5" />
      </div>
      {beneficiaryName ? (
        <div>
          <label className="label text-xs">Điểm {beneficiaryName.split(" ").at(-1)}</label>
          <input name="beneficiaryPoints" type="number" min={0} max={100} className="input" placeholder="vd: 2" />
        </div>
      ) : (
        <div />
      )}
      <div>
        <label className="label text-xs">Lời nhắn (không bắt buộc)</label>
        <input name="teacherNote" className="input" maxLength={1000} />
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-3">
        <button name="intent" value="approve" className="btn-primary btn-sm" disabled={pending}>
          ✓ Duyệt và cộng điểm
        </button>
        <button name="intent" value="reject" className="btn-secondary btn-sm" disabled={pending}>
          Không duyệt
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
