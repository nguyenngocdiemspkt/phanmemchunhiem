"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPollAction, voteAction } from "@/lib/pollActions";
import { MAX_OPTIONS, MIN_OPTIONS } from "@/lib/polls";
import { FormMessage } from "./ui";

/** GVCN tạo bình chọn: nội dung, các lựa chọn, giờ bắt đầu/kết thúc */
export function CreatePollForm({ classId, defaults }: { classId: string; defaults: { startAt: string; endAt: string } }) {
  const [state, action, pending] = useActionState(createPollAction.bind(null, classId), null);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setOptions(["", ""]);
    }
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <div>
        <label className="label">Nội dung bình chọn *</label>
        <input name="question" className="input" maxLength={300} placeholder="vd: Lớp mình đi dã ngoại ở đâu?" required />
      </div>
      <div>
        <label className="label">Mô tả thêm</label>
        <textarea name="description" className="input min-h-16" maxLength={2000} />
      </div>
      <div>
        <span className="label">Các lựa chọn *</span>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="option"
                className="input"
                value={o}
                maxLength={200}
                placeholder={`Lựa chọn ${i + 1}`}
                onChange={(e) => setOptions(options.map((x, k) => (k === i ? e.target.value : x)))}
              />
              {options.length > MIN_OPTIONS && (
                <button type="button" className="btn-secondary btn-sm" aria-label="Bỏ lựa chọn" onClick={() => setOptions(options.filter((_, k) => k !== i))}>
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {options.length < MAX_OPTIONS && (
          <button type="button" className="btn-secondary btn-sm mt-2" onClick={() => setOptions([...options, ""])}>
            + Thêm lựa chọn
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Bắt đầu *</label>
          <input name="startAt" type="datetime-local" className="input" defaultValue={defaults.startAt} required />
        </div>
        <div>
          <label className="label">Kết thúc *</label>
          <input name="endAt" type="datetime-local" className="input" defaultValue={defaults.endAt} required />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang tạo..." : "Tạo bình chọn"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

/** Học sinh chọn một phương án */
export function VoteForm({ pollId, options, current }: { pollId: string; options: { id: string; text: string }[]; current: string | null }) {
  const [state, action, pending] = useActionState(voteAction.bind(null, pollId), null);
  return (
    <form action={action} className="space-y-2">
      {options.map((o) => (
        <label
          key={o.id}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
        >
          <input type="radio" name="optionId" value={o.id} defaultChecked={o.id === current} required className="accent-teal-700" />
          {o.text}
        </label>
      ))}
      <div className="flex items-center gap-3">
        <button className="btn-primary btn-sm" disabled={pending}>
          {pending ? "Đang gửi..." : current ? "Đổi lựa chọn" : "Bình chọn"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
