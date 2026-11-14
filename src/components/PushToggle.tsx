"use client";

import { useEffect, useState } from "react";

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

/**
 * Bật/tắt nhắc nhở bằng thông báo đẩy trên thiết bị đang dùng.
 * Nhắc khi sắp hết hạn phiếu tự đánh giá mà em chưa làm (24 giờ và 3 giờ trước hạn).
 */
export function PushToggle({ publicKey, compact = false }: { publicKey: string | null; compact?: boolean }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        return setState(ios && !standalone ? "ios-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // Báo lại cho máy chủ (phòng khi đăng ký cũ đã bị xóa)
          await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
          setState("on");
        } else setState("off");
      } catch {
        setState("unsupported");
      }
    })();
  }, []);

  if (!publicKey) return null;

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(publicKey!) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!res.ok) throw new Error("save");
      setState("on");
      setMsg("Đã bật nhắc nhở trên thiết bị này.");
    } catch {
      setMsg("Không bật được nhắc nhở trên trình duyệt này. Em thử lại hoặc dùng Chrome/Edge/Safari bản mới.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setState("off");
      setMsg("Đã tắt nhắc nhở trên thiết bị này.");
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    const r = await fetch("/api/push/test", { method: "POST" }).then((x) => x.json()).catch(() => ({ delivered: 0 }));
    setMsg(r.delivered ? "Đã gửi thông báo thử, em kiểm tra trên màn hình nhé." : "Chưa gửi được, em thử bật lại nhắc nhở.");
    setBusy(false);
  }

  const box = compact ? "rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm" : "card";
  return (
    <div className={box} data-testid="push-toggle">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-semibold">🔔 Nhắc làm phiếu tự đánh giá</div>
          <div className="text-xs text-slate-600">
            {state === "on"
              ? "Đang bật trên thiết bị này: em sẽ nhận thông báo 24 giờ và 3 giờ trước hạn nếu chưa làm phiếu (không nhắc từ 22h đến 6h)."
              : "Nhận thông báo trên điện thoại/máy tính khi sắp hết hạn mà em chưa làm phiếu, kể cả khi không mở phần mềm."}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {state === "off" && (
            <button type="button" className="btn-primary btn-sm" onClick={enable} disabled={busy}>
              {busy ? "Đang bật..." : "Bật nhắc nhở"}
            </button>
          )}
          {state === "on" && (
            <>
              <button type="button" className="btn-secondary btn-sm" onClick={test} disabled={busy}>
                Gửi thử
              </button>
              <button type="button" className="btn-secondary btn-sm" onClick={disable} disabled={busy}>
                Tắt
              </button>
            </>
          )}
        </div>
      </div>
      {state === "ios-install" && (
        <p className="mt-2 text-xs text-amber-800">
          Trên iPhone/iPad: bấm nút Chia sẻ <b>⎋</b> › <b>Thêm vào MH chính</b>, mở Class Master từ biểu tượng trên màn hình chính rồi bật nhắc nhở (cần iOS 16.4 trở lên).
        </p>
      )}
      {state === "denied" && (
        <p className="mt-2 text-xs text-amber-800">
          Em đã chặn thông báo cho trang này. Hãy mở cài đặt trang trong trình duyệt (biểu tượng ổ khóa cạnh địa chỉ) › cho phép Thông báo, rồi tải lại trang.
        </p>
      )}
      {state === "unsupported" && <p className="mt-2 text-xs text-slate-500">Trình duyệt này chưa hỗ trợ thông báo đẩy.</p>}
      {msg && <p className="mt-2 text-xs text-teal-800">{msg}</p>}
    </div>
  );
}
