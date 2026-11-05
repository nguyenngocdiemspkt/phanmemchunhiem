"use client";

import { useActionState, useState } from "react";
import { FormMessage } from "@/components/ui";
import { saveFeedbackAction } from "./actions";

export function FeedbackEditor({
  responseId,
  initial,
  draft,
  status,
  reviewNote,
}: {
  responseId: string;
  initial: { content: string; goals: string[] } | null;
  draft: { content: string; goals: string[] };
  status: "SUBMITTED" | "REVISION" | "APPROVED";
  reviewNote: string | null;
}) {
  const approved = status === "APPROVED";
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
        <button name="intent" value="approve" className="btn-primary" disabled={pending}>
          {approved ? "Cập nhật & công bố lại" : "✓ Duyệt & công bố"}
        </button>
        <button name="intent" value="draft" className="btn-secondary" disabled={pending}>
          Lưu nháp
        </button>
        {approved && (
          <button
            name="intent"
            value="unapprove"
            className="btn-danger"
            disabled={pending}
            onClick={(e) => {
              if (!confirm("Hủy duyệt? Học sinh và phụ huynh sẽ không còn thấy kết quả cho tới khi duyệt lại.")) e.preventDefault();
            }}
          >
            Hủy duyệt
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Duyệt = khóa phiếu (học sinh không sửa được nữa) và công bố điểm, nhận xét cho học sinh và phụ huynh. Nhận xét không bắt buộc.
      </p>

      {!approved && (
        <details className="rounded-lg border border-amber-200 bg-amber-50 p-3" open={status === "REVISION"}>
          <summary className="cursor-pointer text-sm font-medium text-amber-900">
            {status === "REVISION" ? "Đã yêu cầu học sinh sửa phiếu" : "Yêu cầu học sinh sửa / bổ sung"}
          </summary>
          <textarea
            name="reviewNote"
            className="input mt-2 min-h-20"
            defaultValue={reviewNote ?? ""}
            placeholder="vd: Em khai thiếu lần đi trễ thứ Năm, em xem lại và bổ sung nhé."
          />
          <button name="intent" value="revision" className="btn-secondary mt-2" disabled={pending}>
            Gửi yêu cầu sửa
          </button>
        </details>
      )}
    </form>
  );
}
