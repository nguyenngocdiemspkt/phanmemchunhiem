import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Body = { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

/** Lưu đăng ký nhận thông báo đẩy của trình duyệt đang dùng */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Body;
  const endpoint = String(b.endpoint ?? "");
  const p256dh = String(b.keys?.p256dh ?? "");
  const auth = String(b.keys?.auth ?? "");
  if (!/^https?:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth || p256dh.length > 200 || auth.length > 100) {
    return new Response("Bad request", { status: 400 });
  }
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 200);
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth, userAgent },
    update: { userId: user.id, p256dh, auth, userAgent },
  });
  return Response.json({ ok: true });
}

/** Tắt nhắc nhở trên trình duyệt đang dùng */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Body;
  await prisma.pushSubscription.deleteMany({ where: { endpoint: String(b.endpoint ?? ""), userId: user.id } });
  return Response.json({ ok: true });
}
