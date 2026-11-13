import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { realtimePublicUrl, rtcIceServers, signGardenTicket } from "@/lib/realtime";

/**
 * Cấp vé vào vườn realtime.
 * - Học sinh: vé của lớp mình, kèm vị trí hiện tại (?x=&y=)
 * - GVCN/quản trị: ?lop=<classId>, vé chỉ xem (không có nhân vật, không chat)
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const headers = { "Cache-Control": "no-store" };

  if (user.role === "STUDENT") {
    if (!user.student || user.student.status !== "ACTIVE") return new Response("Forbidden", { status: 403 });
    const x = Math.trunc(Number(url.searchParams.get("x")));
    const y = Math.trunc(Number(url.searchParams.get("y")));
    const ve = await signGardenTicket({
      sub: user.student.id,
      cid: user.student.classId,
      role: "student",
      name: user.fullName,
      ...(Number.isFinite(x) && Number.isFinite(y) ? { x, y } : {}),
    });
    return Response.json({ url: realtimePublicUrl(), ve, ice: rtcIceServers() }, { headers });
  }

  const classId = url.searchParams.get("lop") ?? "";
  const allowed =
    user.role === "ADMIN"
      ? (await prisma.classroom.count({ where: { id: classId } })) > 0
      : (await prisma.classroom.count({ where: { id: classId, homeroomTeacherId: user.id } })) > 0;
  if (!allowed) return new Response("Not found", { status: 404 });
  const ve = await signGardenTicket({ sub: user.id, cid: classId, role: "observer", name: user.fullName });
  return Response.json({ url: realtimePublicUrl(), ve }, { headers });
}
