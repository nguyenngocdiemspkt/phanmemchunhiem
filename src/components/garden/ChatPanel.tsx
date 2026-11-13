"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMsg } from "./useGardenRealtime";

/** Phòng chat chung của lớp trong vườn: ai trong lớp cũng thấy, không có chat riêng */
export function ChatPanel({
  messages,
  meId,
  canSend,
  enabled,
  connected,
  notice,
  onSend,
}: {
  messages: ChatMsg[];
  meId: string | null;
  canSend: boolean;
  enabled: boolean;
  connected: boolean;
  notice: string | null;
  onSend: (text: string) => boolean;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length]);

  return (
    <div
      className="card flex h-full flex-col p-0 sm:p-0"
      data-testid="chat-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
        <h2 className="font-semibold">Phòng chat của lớp</h2>
        <span
          className={`text-xs ${connected ? "text-emerald-700" : "text-slate-400"}`}
        >
          {connected ? "● Đang kết nối" : "○ Đang kết nối lại..."}
        </span>
      </div>
      <div
        ref={listRef}
        className="h-72 flex-1 space-y-2 overflow-y-auto px-4 py-3 text-sm"
      >
        {messages.length === 0 && (
          <p className="text-slate-400">Chưa có tin nhắn nào.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.studentId === meId ? "text-right" : ""}>
            <span className="text-xs text-slate-500">
              {m.studentId === meId ? "Em" : m.name} ·{" "}
              {new Date(m.at).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <div
              className={`mt-0.5 inline-block max-w-[85%] rounded-2xl px-3 py-1.5 text-left ${m.studentId === meId ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-800"}`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>
      {notice && <p className="px-4 pb-1 text-xs text-amber-700">{notice}</p>}
      {canSend ? (
        enabled ? (
          <form
            className="flex gap-2 border-t border-slate-200 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const t = text.trim();
              if (t && onSend(t)) setText("");
            }}
          >
            <input
              className="input"
              value={text}
              maxLength={300}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhắn cho cả lớp..."
              aria-label="Tin nhắn"
              disabled={!connected}
            />
            <button
              className="btn-primary"
              disabled={!connected || !text.trim()}
            >
              Gửi
            </button>
          </form>
        ) : (
          <p className="border-t border-slate-200 p-3 text-sm text-slate-500">
            Thầy/cô đang tắt phòng chat.
          </p>
        )
      ) : (
        <p className="border-t border-slate-200 p-3 text-xs text-slate-500">
          Giáo viên chỉ xem. Quản lý tin nhắn ở thẻ Chat của lớp.
        </p>
      )}
    </div>
  );
}
