import { runReminders } from "@/lib/reminders";

/** Chạy nhắc nhở ngay (dùng nội bộ/kiểm thử). Cần header x-cron-secret = AUTH_SECRET */
export async function POST(req: Request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) return new Response("Forbidden", { status: 403 });
  const at = req.headers.get("x-cron-now");
  const now = at && !isNaN(Date.parse(at)) && process.env.NODE_ENV !== "production" ? new Date(at) : new Date();
  return Response.json(await runReminders(now));
}
