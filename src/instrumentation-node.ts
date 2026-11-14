/**
 * Nhắc học sinh làm phiếu tự đánh giá mỗi 5 phút (thông báo đẩy). Tắt bằng REMINDERS_DISABLED=1.
 */
import { runReminders } from "./lib/reminders";

const g = globalThis as unknown as { __reminderTimer?: ReturnType<typeof setInterval> };
if (process.env.REMINDERS_DISABLED !== "1" && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && !g.__reminderTimer) {
  const tick = () =>
    runReminders()
      .then((r) => r.sent && console.log(`Nhắc làm phiếu: ${r.sent} học sinh, ${r.devices} thiết bị`))
      .catch((e) => console.error("Nhắc làm phiếu lỗi:", e));
  g.__reminderTimer = setInterval(tick, 5 * 60 * 1000);
  setTimeout(tick, 60 * 1000);
}
