/**
 * Chạy khi máy chủ Next.js khởi động. Phần nhắc làm phiếu (thông báo đẩy) chỉ chạy ở môi trường Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
