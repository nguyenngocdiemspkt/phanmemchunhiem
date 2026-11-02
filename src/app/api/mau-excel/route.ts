import { getCurrentUser } from "@/lib/auth";
import { buildStudentTemplate } from "@/lib/excel";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role === "STUDENT") return new Response("Unauthorized", { status: 401 });
  const buffer = await buildStudentTemplate();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-danh-sach-hoc-sinh.xlsx"',
    },
  });
}
