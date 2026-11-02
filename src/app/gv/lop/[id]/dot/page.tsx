import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDateTime, percent, surveyStatus, toLocalInput } from "@/lib/format";
import { Empty, ProgressBar, StatusBadge } from "@/components/ui";
import { CreateSurveyForm } from "@/app/gv/dot/SurveyForms";

const DAY = 24 * 60 * 60 * 1000;

/** Gợi ý mặc định: tuần hiện tại (thứ Hai – Chủ nhật), đóng phiếu 21:00 Chủ nhật */
function weekDefaults(now: Date) {
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const monday = new Date(vn.getTime() - ((vn.getUTCDay() + 6) % 7) * DAY);
  const sunday = new Date(monday.getTime() + 6 * DAY);
  const dm = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    title: `Tuần ${dm(monday)} – ${dm(sunday)}`,
    openAt: toLocalInput(now),
    closeAt: `${sunday.toISOString().slice(0, 10)}T21:00`,
  };
}

export default async function ClassSurveysPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireClassAccess(id);
  const now = new Date();

  const [surveys, studentCount, myClasses, templates] = await Promise.all([
    prisma.survey.findMany({
      where: { classId: id },
      orderBy: { openAt: "desc" },
      select: { id: true, title: true, openAt: true, closeAt: true, _count: { select: { responses: true } } },
    }),
    prisma.student.count({ where: { classId: id, user: { active: true } } }),
    prisma.classroom.findMany({
      where: user.role === "ADMIN" ? { id } : { homeroomTeacherId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.formTemplate.findMany({
      where: user.role === "ADMIN" ? {} : { OR: [{ isShared: true }, { ownerId: user.id }] },
      orderBy: [{ isShared: "desc" }, { updatedAt: "desc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <details className="card" open={surveys.length === 0}>
        <summary className="cursor-pointer font-semibold">+ Tạo đợt tự đánh giá mới</summary>
        <div className="mt-4">
          <CreateSurveyForm classes={myClasses} currentClassId={id} templates={templates} defaults={weekDefaults(now)} />
        </div>
      </details>

      {surveys.length === 0 ? (
        <Empty>Chưa có đợt nào.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Đợt</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th className="w-44">Đã nộp</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((s) => {
                const rate = percent(s._count.responses, studentCount);
                return (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/gv/dot/${s.id}`} className="link">
                        {s.title}
                      </Link>
                    </td>
                    <td className="text-xs text-slate-600">
                      {fmtDateTime(s.openAt)}
                      <br />→ {fmtDateTime(s.closeAt)}
                    </td>
                    <td>
                      <StatusBadge status={surveyStatus(s, now)} />
                    </td>
                    <td>
                      <div className="text-xs text-slate-600">
                        {s._count.responses}/{studentCount} ({rate}%)
                      </div>
                      <ProgressBar value={rate} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
