"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui";
import { saveFeedbackAction } from "./actions";

export function FeedbackEditor({
  responseId,
  initial,
  draft,
  published,
}: {
  responseId: string;
  initial: { content: string; goals: string[] } | null;
  draft: { content: string; goals: string[] };
  published: boolean;
}) {
  const [state, action, pending] = useActionState(saveFeedbackAction.bind(null, responseId), null);
  const [content, setContent] = useState(initial?.content ?? "");
  const [goals, setGoals] = useState<string[]>(initial?.goals.length ? initial.goals : [""]);

  function applyDraft() {
    if (content.trim() && !confirm("Thay nội dung hiện tại bằng gợi ý?")) return;
    setContent(draft.content);
    setGoals(draft.goals.length ? draft.goals : [""]);
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="label mb-0">Nhận xét của giáo viên</label>
          <button type="button" className="btn-secondary btn-sm" onClick={applyDraft}>
            Điền gợi ý từ câu trả lời
          </button>
        </div>
        <textarea
          name="content"
          className="input min-h-48"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ghi nhận điểm tốt, nhắc nhở nhẹ nhàng điều cần cải thiện, động viên em..."
        />
        <p className="mt-1 text-xs text-slate-500">
          Gợi ý được tạo theo quy tắc từ các lựa chọn của học sinh trong mẫu phiếu. Thầy/cô nên chỉnh sửa cho phù hợp với từng em.
        </p>
      </div>

      <div>
        <label className="label">Thử thách / mục tiêu tuần tới</label>
        <div className="space-y-2">
          {goals.map((g, i) => (
            <div key={i} className="flex gap-2">
              <span className="pt-2 text-sm text-slate-500">{i + 1}.</span>
              <input
                name="goal"
                className="input"
                value={g}
                onChange={(e) => setGoals(goals.map((x, j) => (j === i ? e.target.value : x)))}
              />
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setGoals(goals.length > 1 ? goals.filter((_, j) => j !== i) : [""])}
                aria-label="Xóa mục tiêu"
              >
                ✕
              </button>
            </div>
          ))}
          {goals.length < 5 && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setGoals([...goals, ""])}>
              + Thêm mục tiêu
            </button>
          )}
        </div>
      </div>

      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <button name="intent" value="publish" className="btn-primary" disabled={pending}>
          {published ? "Cập nhật & gửi lại" : "Gửi cho học sinh"}
        </button>
        <button name="intent" value="draft" className="btn-secondary" disabled={pending}>
          Lưu nháp
        </button>
        {published && (
          <button name="intent" value="unpublish" className="btn-danger" disabled={pending}>
            Thu hồi
          </button>
        )}
      </div>
    </form>
  );
}
