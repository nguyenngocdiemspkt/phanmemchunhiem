import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

/** Gửi thông báo thử tới các thiết bị của chính mình */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const delivered = await sendPushToUser(user.id, {
    title: "Class Master",
    body: "Nhắc nhở đã bật. Em sẽ nhận thông báo khi sắp hết hạn mà chưa làm phiếu tự đánh giá.",
    url: user.role === "STUDENT" ? "/hs" : "/",
    tag: "thu",
  });
  return Response.json({ delivered });
}
