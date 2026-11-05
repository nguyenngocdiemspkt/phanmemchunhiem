"use client";

import { useState } from "react";
import Link from "next/link";
import { markParentNotifiedAction } from "@/lib/parentActions";

/**
 * Nút nhắn tin phụ huynh: mở ứng dụng Tin nhắn trên điện thoại với nội dung soạn sẵn,
 * hoặc sao chép để dán vào Zalo. Không qua dịch vụ trả phí nào.
 */
export function ParentNotifyButtons({
  feedbackId,
  phone,
  message,
  notifiedAt,
  studentId,
  compact = false,
}: {
  feedbackId: string;
  phone: string | null;
  message: string;
  notifiedAt: string | null;
  studentId: string;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [marked, setMarked] = useState(notifiedAt);

  function mark() {
    setMarked(new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }));
    void markParentNotifiedAction(feedbackId);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // Trình duyệt chặn clipboard: cho giáo viên tự chép
      window.prompt("Sao chép tin nhắn dưới đây:", message);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    mark();
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "" : "gap-2"}`}>
      {phone ? (
        <a href={`sms:${phone}?&body=${encodeURIComponent(message)}`} onClick={mark} className="btn-secondary btn-sm" title={`Nhắn tới ${phone}`}>
          📱 {compact ? "SMS" : `Nhắn SMS tới ${phone}`}
        </a>
      ) : (
        <Link href={`/gv/hoc-sinh/${studentId}`} className="text-xs text-amber-700 hover:underline">
          Chưa có SĐT phụ huynh
        </Link>
      )}
      <button type="button" onClick={copy} className="btn-secondary btn-sm" title="Sao chép để dán vào Zalo">
        {copied ? "✓ Đã chép" : compact ? "📋 Chép" : "📋 Sao chép (dán vào Zalo)"}
      </button>
      {marked && <span className="text-xs text-emerald-700">✓ Đã báo PH {marked}</span>}
    </div>
  );
}
