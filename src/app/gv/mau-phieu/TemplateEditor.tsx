"use client";

import { useActionState, useState, useTransition } from "react";
import { FormMessage } from "@/components/ui";
import { newId, type ChoiceOption, type Question } from "@/lib/questions";
import { saveTemplateAction } from "./actions";

function blankQuestion(type: Question["type"]): Question {
  return type === "single"
    ? {
        id: newId(),
        type,
        text: "",
        required: true,
        options: [
          { id: newId(), label: "", score: 2 },
          { id: newId(), label: "", score: 1 },
          { id: newId(), label: "", score: 0 },
        ],
      }
    : { id: newId(), type, text: "", required: false };
}

export function TemplateEditor({
  templateId,
  initial,
  canShare,
}: {
  templateId: string | null;
  initial: { name: string; description: string; questions: Question[]; isShared: boolean };
  canShare: boolean;
}) {
  const [state, action, pending] = useActionState(saveTemplateAction.bind(null, templateId), null);
  const [questions, setQuestions] = useState<Question[]>(initial.questions);
  const [, startTransition] = useTransition();

  const updateQ = (i: number, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const updateOpt = (qi: number, oi: number, patch: Partial<ChoiceOption>) =>
    setQuestions((qs) =>
      qs.map((q, j) => (j === qi ? { ...q, options: q.options!.map((o, k) => (k === oi ? { ...o, ...patch } : o)) } : q)),
    );
  const move = (i: number, d: -1 | 1) =>
    setQuestions((qs) => {
      const next = [...qs];
      const j = i + d;
      if (j < 0 || j >= next.length) return qs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <form
      // Gửi thủ công để React không tự đặt lại form sau khi lưu
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-6"
    >
      <input type="hidden" name="questions" value={JSON.stringify(questions)} />
      <div className="card grid gap-3">
        <div>
          <label className="label">Tên mẫu phiếu *</label>
          <input name="name" className="input" defaultValue={initial.name} required />
        </div>
        <div>
          <label className="label">Mô tả</label>
          <input name="description" className="input" defaultValue={initial.description} />
        </div>
        {canShare && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isShared" defaultChecked={initial.isShared} /> Dùng chung cho tất cả giáo viên
          </label>
        )}
      </div>

      <div className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
        <b>Cách chấm điểm & gợi ý:</b> mỗi lựa chọn trắc nghiệm có <b>điểm</b> (cao = tốt) để vẽ biểu đồ tiến bộ. Đánh dấu{" "}
        <b>Cần quan tâm</b> để hệ thống cảnh báo giáo viên khi học sinh chọn ý đó. <b>Mục tiêu gợi ý</b> sẽ được đề xuất làm thử thách
        tuần tới khi giáo viên viết nhận xét.
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="card space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-slate-500">Câu {i + 1}</span>
            <select
              className="input w-auto"
              value={q.type}
              onChange={(e) => {
                const type = e.target.value as Question["type"];
                updateQ(i, type === "single" ? { type, options: q.options ?? blankQuestion("single").options } : { type });
              }}
            >
              <option value="single">Trắc nghiệm (chọn 1)</option>
              <option value="text">Tự luận</option>
            </select>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={q.required} onChange={(e) => updateQ(i, { required: e.target.checked })} /> Bắt buộc
            </label>
            <div className="ml-auto flex gap-1">
              <button type="button" className="btn-secondary btn-sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Lên">
                ↑
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => move(i, 1)}
                disabled={i === questions.length - 1}
                aria-label="Xuống"
              >
                ↓
              </button>
              <button
                type="button"
                className="btn-danger btn-sm"
                onClick={() => confirm("Xóa câu hỏi này?") && setQuestions((qs) => qs.filter((_, j) => j !== i))}
              >
                Xóa
              </button>
            </div>
          </div>
          <input
            className="input font-medium"
            placeholder="Nội dung câu hỏi"
            value={q.text}
            onChange={(e) => updateQ(i, { text: e.target.value })}
          />
          {q.type === "single" && (
            <div className="space-y-2">
              {q.options!.map((o, oi) => (
                <div key={o.id} className="grid gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-[1fr_5rem_auto_auto]">
                  <input
                    className="input"
                    placeholder={`Lựa chọn ${oi + 1}`}
                    value={o.label}
                    onChange={(e) => updateOpt(i, oi, { label: e.target.value })}
                  />
                  <input
                    className="input"
                    type="number"
                    step="1"
                    title="Điểm"
                    value={o.score}
                    onChange={(e) => updateOpt(i, oi, { score: Number(e.target.value) })}
                  />
                  <label className="flex items-center gap-1.5 whitespace-nowrap text-sm">
                    <input type="checkbox" checked={!!o.alert} onChange={(e) => updateOpt(i, oi, { alert: e.target.checked })} /> Cần quan
                    tâm
                  </label>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    disabled={q.options!.length <= 2}
                    onClick={() => updateQ(i, { options: q.options!.filter((_, k) => k !== oi) })}
                    aria-label="Xóa lựa chọn"
                  >
                    ✕
                  </button>
                  <input
                    className="input text-xs sm:col-span-4"
                    placeholder="Mục tiêu gợi ý khi chọn ý này (không bắt buộc)"
                    value={o.goal ?? ""}
                    onChange={(e) => updateOpt(i, oi, { goal: e.target.value })}
                  />
                </div>
              ))}
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => updateQ(i, { options: [...q.options!, { id: newId(), label: "", score: 0 }] })}
              >
                + Thêm lựa chọn
              </button>
            </div>
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary" onClick={() => setQuestions((qs) => [...qs, blankQuestion("single")])}>
          + Câu trắc nghiệm
        </button>
        <button type="button" className="btn-secondary" onClick={() => setQuestions((qs) => [...qs, blankQuestion("text")])}>
          + Câu tự luận
        </button>
      </div>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu mẫu phiếu"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
