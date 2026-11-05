"use client";

import { useActionState, useTransition } from "react";
import type { Answers, Question } from "@/lib/questions";
import { FormMessage } from "@/components/ui";
import { submitResponseAction } from "./actions";
import type { Counts, Criterion } from "@/lib/scoring";
import { CriteriaInput } from "./CriteriaInput";

export function SurveyForm({
  surveyId,
  questions,
  initial,
  readOnly,
  scoring,
}: {
  surveyId: string;
  questions: Question[];
  initial: Answers;
  readOnly: boolean;
  scoring?: { criteria: Criterion[]; baseScore: number; counts: Counts } | null;
}) {
  const [state, action, pending] = useActionState(submitResponseAction.bind(null, surveyId), null);
  const [, startTransition] = useTransition();
  return (
    <form
      // Gửi thủ công để React không tự xóa câu trả lời khi server báo lỗi
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="space-y-4"
    >
      <fieldset disabled={readOnly || pending} className="space-y-4">
        {scoring && <CriteriaInput criteria={scoring.criteria} baseScore={scoring.baseScore} initial={scoring.counts} readOnly={readOnly} />}
        {questions.map((q, i) => (
          <div key={q.id} className="card">
            <div className="mb-3 font-medium text-slate-900">
              {i + 1}. {q.text}
              {q.required && <span className="text-red-600"> *</span>}
            </div>
            {q.type === "single" ? (
              <div className="space-y-2">
                {q.options!.map((o) => (
                  <label
                    key={o.id}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-sm has-[:checked]:border-teal-600 has-[:checked]:bg-teal-50"
                  >
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={o.id}
                      defaultChecked={initial[q.id] === o.id}
                      required={q.required}
                      className="mt-0.5 accent-teal-700"
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                name={`q_${q.id}`}
                className="input min-h-24"
                defaultValue={initial[q.id] ?? ""}
                required={q.required}
                maxLength={3000}
                placeholder="Em viết câu trả lời ở đây..."
              />
            )}
          </div>
        ))}
      </fieldset>
      <FormMessage state={state} />
      {!readOnly && (
        <button className="btn-primary w-full py-3 text-base" disabled={pending}>
          {pending ? "Đang gửi..." : "Gửi phiếu"}
        </button>
      )}
    </form>
  );
}
