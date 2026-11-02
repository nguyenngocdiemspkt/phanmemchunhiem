import Link from "next/link";
import { prisma } from "@/lib/db";
import { latestSurveyStats } from "@/lib/classStats";
import { percent, surveyStatus } from "@/lib/format";
import { Empty, PageHeader, ProgressBar, Stat, StatusBadge } from "@/components/ui";

export default async function AdminDashboard() {
  const [teacherCount, studentCount, classes] = await Promise.all([
    prisma.user.count({ where: { role: "TEACHER", active: true } }),
    prisma.student.count({ where: { user: { active: true } } }),
    prisma.classroom.findMany({
      orderBy: [{ schoolYear: "desc" }, { name: "asc" }],
      include: {
        homeroomTeacher: { select: { fullName: true } },
        _count: { select: { students: { where: { user: { active: true } } } } },
      },
    }),
  ]);
  const stats = await latestSurveyStats(classes.map((c) => c.id));
  const openCount = [...stats.values()].filter((s) => surveyStatus(s) === "open").length;
  const urgentCount = [...stats.values()].reduce((n, s) => n + s.responses.length, 0);

  return (
    <>
      <PageHeader title="Tổng quan toàn trường" />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Giáo viên" value={teacherCount} />
        <Stat label="Lớp học" value={classes.length} />
        <Stat label="Học sinh" value={studentCount} />
        <Stat
          label="Đợt đang mở"
          value={openCount}
          hint={urgentCount ? <span className="text-red-700">{urgentCount} phiếu cần xử lý khẩn</span> : undefined}
        />
      </div>

      <div className="card overflow-x-auto p-0 sm:p-0">
        {classes.length === 0 ? (
          <div className="p-5">
            <Empty>
              Chưa có lớp nào.{" "}
              <Link href="/admin/lop" className="link">
                Tạo lớp học
              </Link>
            </Empty>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Lớp</th>
                <th>GV chủ nhiệm</th>
                <th>Sĩ số</th>
                <th>Đợt gần nhất</th>
                <th className="w-48">Tỷ lệ nộp</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => {
                const s = stats.get(c.id);
                const rate = s ? percent(s._count.responses, c._count.students) : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/gv/lop/${c.id}`} className="link">
                        {c.name}
                      </Link>
                      <div className="text-xs text-slate-500">{c.schoolYear}</div>
                    </td>
                    <td>{c.homeroomTeacher?.fullName ?? <span className="text-slate-400">Chưa phân công</span>}</td>
                    <td>{c._count.students}</td>
                    <td>
                      {s ? (
                        <div className="space-y-1">
                          <div>{s.title}</div>
                          <StatusBadge status={surveyStatus(s)} />
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      {s && (
                        <div className="space-y-1">
                          <div className="text-xs text-slate-600">
                            {s._count.responses}/{c._count.students} ({rate}%)
                          </div>
                          <ProgressBar value={rate} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
