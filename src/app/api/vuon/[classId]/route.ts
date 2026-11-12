import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Vị trí các nhân vật trong vườn lớp (trình duyệt hỏi lại vài giây một lần). Chỉ học sinh lớp đó, GVCN, quản trị. */
export async function GET(_req: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const allowed =
    user.role === "ADMIN" ||
    (user.role === "STUDENT" && user.student?.classId === classId) ||
    (user.role === "TEACHER" && (await prisma.classroom.count({ where: { id: classId, homeroomTeacherId: user.id } })) > 0);
  if (!allowed) return new Response("Not found", { status: 404 });
  const students = await prisma.student.findMany({
    where: { classId, status: "ACTIVE", posX: { not: null } },
    select: { id: true, posX: true, posY: true },
  });
  return Response.json(
    students.map((s) => ({ id: s.id, x: s.posX, y: s.posY })),
    { headers: { "Cache-Control": "no-store" } },
  );
}
