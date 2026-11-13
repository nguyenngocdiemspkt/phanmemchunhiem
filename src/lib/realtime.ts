import { SignJWT } from "jose";

/** Địa chỉ WebSocket cho trình duyệt. Mặc định cùng tên miền, đường dẫn /realtime (nginx chuyển tới dịch vụ realtime). */
export function realtimePublicUrl() {
  return process.env.REALTIME_PUBLIC_URL ?? "/realtime";
}

/** Vé vào vườn (JWT 15 phút) để dịch vụ realtime biết em là ai, lớp nào. Giáo viên nhận vé chỉ xem. */
export async function signGardenTicket(t: {
  sub: string;
  cid: string;
  role: "student" | "observer";
  name: string;
  x?: number;
  y?: number;
}) {
  return new SignJWT({ ...t, typ: "vuon" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET ?? ""));
}

/** Báo cho dịch vụ realtime (GVCN bật/tắt chat, xóa tin). Dịch vụ không chạy thì bỏ qua. */
export async function notifyRealtime(
  msg:
    | { type: "chatState"; classId: string; enabled: boolean }
    | { type: "chatDeleted"; classId: string; id: string },
) {
  const base = process.env.REALTIME_INTERNAL_URL ?? "http://127.0.0.1:3101";
  try {
    await fetch(`${base}/notify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...msg, secret: process.env.AUTH_SECRET }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Dịch vụ realtime chưa chạy (vd khi triển khai trên Vercel): bỏ qua
  }
}

/**
 * Máy chủ ICE cho WebRTC (giọng nói). Mặc định STUN công cộng; đặt RTC_ICE_SERVERS (JSON) để thêm TURN, ví dụ
 * [{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.example.org:3478","username":"u","credential":"p"}]
 */
export function rtcIceServers(): {
  urls: string | string[];
  username?: string;
  credential?: string;
}[] {
  try {
    const v = process.env.RTC_ICE_SERVERS;
    if (v) return JSON.parse(v);
  } catch {
    // cấu hình sai: dùng mặc định
  }
  return [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
  ];
}
