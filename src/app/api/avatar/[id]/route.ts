import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Ảnh đại diện, chỉ cho người đã đăng nhập. Đường dẫn có ?v=<thời điểm cập nhật> nên được cache lâu. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const avatar = await prisma.userAvatar.findUnique({ where: { userId: id } });
  if (!avatar) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(avatar.data), {
    headers: {
      "Content-Type": avatar.type,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
