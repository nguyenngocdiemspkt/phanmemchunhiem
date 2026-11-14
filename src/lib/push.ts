import webpush from "web-push";
import { prisma } from "./db";

/** Thông báo đẩy (Web Push). Cần VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT trong .env */
let configured: boolean | null = null;
function setup() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://example.com", pub, priv);
  return (configured = true);
}

export function pushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Gửi tới mọi thiết bị đã đăng ký của một người. Trả về số thiết bị nhận thành công; tự xóa đăng ký đã hết hạn. */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!setup()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let ok = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
          TTL: 6 * 60 * 60,
          urgency: "high",
          topic: payload.tag?.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, "") || undefined,
        });
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        // 404/410: trình duyệt đã hủy đăng ký -> xóa
        if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.error("Gửi thông báo đẩy lỗi:", code ?? (e as Error).message);
      }
    }),
  );
  return ok;
}
