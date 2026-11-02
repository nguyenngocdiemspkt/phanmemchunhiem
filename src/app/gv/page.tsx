import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { latestSurveyStats } from "@/lib/classStats";
import { fmtDateTime, percent, surveyStatus } from "@/lib/format";
import { Badge, Empty, PageHeader, ProgressBar, StatusBadge } from "@/components/ui";

export default async function TeacherHome() {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const classes = await prisma.classroom.findMany({
    where: user.role === "ADMIN" ? {} : { homeroomTeacherId: user.id },
    orderBy: [{ schoolYear: "desc" }, { name: "asc" }],
    include: { _count: { select: { students: { where: { user: { active: true } } } } } },
  });
  const stats = await latestSurveyStats(classes.map((c) => c.id));

  return (
    <>
      <PageHeader title={user.role === "ADMIN" ? "Tất cả lớp" : "Lớp chủ nhiệm của tôi"} />
      {classes.length === 0 ? (
        <Empty>Thầy/cô chưa được phân công chủ nhiệm lớp nào. Vui lòng liên hệ quản trị viên.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            const s = stats.get(c.id);
            const rate = s ? percent(s._count.responses, c._count.students) : 0;
            return (
              <Link key={c.id} href={`/gv/lop/${c.id}`} className="card block transition hover:border-teal-400 hover:shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xl font-bold text-slate-900">{c.name}</div>
                    <div className="text-sm text-slate-500">
                      {c.schoolYear} · {c._count.students} học sinh
                    </div>
                  </div>
                  {s && s.responses.length > 0 && (
                    <Badge className="bg-red-100 text-red-800 ring-red-200">⚠ {s.responses.length} khẩn</Badge>
                  )}
                </div>
                {s ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{s.title}</span>
                      <StatusBadge status={surveyStatus(s)} />
                    </div>
                    <ProgressBar value={rate} />
                    <div className="text-xs text-slate-500">
                      Đã nộp {s._count.responses}/{c._count.students} ({rate}%) · Đóng lúc {fmtDateTime(s.closeAt)}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">Chưa có đợt tự đánh giá nào.</p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
