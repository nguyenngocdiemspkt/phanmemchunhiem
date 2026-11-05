import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtShortDate } from "@/lib/format";
import { computePoints, groupName, parseCounts, parseCriteria, RESPONSE_STATUS, signed } from "@/lib/scoring";
import { byVietnameseName } from "@/lib/students";
import { Badge, Empty, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { ReportForm } from "./ReportForm";
import { deleteReportAction } from "./actions";

const REPORT_LABEL = { PENDING: "Chờ thầy/cô xác nhận", ACCEPTED: "Đã chấp nhận", REJECTED: "Không được chấp nhận" } as const;

/**
 * Tổ trưởng chỉ xem phần tự chấm điểm của các bạn trong tổ mình (không xem tổ khác, không xem câu tự nhận xét),
 * và nhận xét / đề xuất bổ sung vi phạm cho tổ viên tổ mình.
 */
export default async function GroupLeaderPage({ searchParams }: { searchParams: Promise<{ dot?: string }> }) {
  const { student: me } = await requireStudent();
  if (!me.isGroupLeader || !me.groupNo) redirect("/hs");
  const surveys = await prisma.survey.findMany({
    where: { classId: me.classId, openAt: { lte: new Date() } },
    orderBy: { openAt: "desc" },
    take: 30,
    select: { id: true, title: true, openAt: true, criteria: true, baseScore: true },
  });
  const scored = surveys.filter((s) => parseCriteria(s.criteria).length > 0).slice(0, 12);
  const { dot } = await searchParams;
  const survey = scored.find((s) => s.id === dot) ?? scored[0];
  const myGroup = groupName(me.classroom.groupNames, me.groupNo);

  if (!survey) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title={`Tổ trưởng ${myGroup}`} back={{ href: "/hs", label: "Trang chính" }} />
        <Empty>Chưa có đợt tự đánh giá nào có chấm điểm theo tiêu chí.</Empty>
      </div>
    );
  }

  const criteria = parseCriteria(survey.criteria);
  // Chỉ lấy dữ liệu của tổ mình: phiếu của tổ khác không được gửi xuống trình duyệt
  const [groupmates, responses, myReports] = await Promise.all([
    prisma.student.findMany({
      where: { classId: me.classId, groupNo: me.groupNo, status: "ACTIVE" },
      select: { id: true, groupNo: true, user: { select: { fullName: true } } },
    }),
    prisma.response.findMany({
      where: { surveyId: survey.id, student: { classId: me.classId, groupNo: me.groupNo } },
      select: { studentId: true, status: true, selfCounts: true, points: true },
    }),
    prisma.scoreReport.findMany({ where: { surveyId: survey.id, reporterId: me.id }, orderBy: { createdAt: "asc" } }),
  ]);
  groupmates.sort(byVietnameseName((s) => s.user.fullName));
  const responseOf = new Map(responses.map((r) => [r.studentId, r]));
  const members = groupmates.filter((s) => s.id !== me.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={`Tổ trưởng ${myGroup}`}
        subtitle="Em xem được phần tự chấm điểm của các bạn trong tổ và gửi thầy/cô nhận xét, bổ sung vi phạm. Thầy/cô xác nhận thì mới tính điểm."
        back={{ href: "/hs", label: "Trang chính" }}
      />

      <div className="flex flex-wrap gap-2">
        {scored.map((s) => (
          <Link
            key={s.id}
            href={`/hs/to-truong?dot=${s.id}`}
            className={`rounded-lg px-3 py-1 text-sm ${s.id === survey.id ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {s.title} ({fmtShortDate(s.openAt)})
          </Link>
        ))}
      </div>

      <section className="space-y-4">
        <h2 className="font-semibold">Tổ viên {myGroup}</h2>
        {members.length === 0 && <Empty>Tổ chưa có bạn nào khác.</Empty>}
        {members.map((m) => {
          const r = responseOf.get(m.id);
          const self = parseCounts(r?.selfCounts);
          const reports = myReports.filter((x) => x.studentId === m.id);
          return (
            <div key={m.id} className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{m.user.fullName}</span>
                {r ? (
                  <Badge className={RESPONSE_STATUS[r.status].style}>{RESPONSE_STATUS[r.status].label}</Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Chưa nộp</Badge>
                )}
              </div>
              {r && (
                <p className="mt-1 text-sm text-slate-600">
                  Tự khai:{" "}
                  {criteria.filter((c) => self[c.id]).map((c) => `${c.name} × ${self[c.id]}`).join("; ") || "không có mục cộng/trừ nào"} → tự chấm{" "}
                  <b>{computePoints(survey.baseScore ?? 0, criteria, self)}</b> điểm
                </p>
              )}
              {reports.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {reports.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-2">
                      <span>
                        {x.criterionName ? `${x.criterionName} × ${x.times} (${signed(x.points * x.times)})` : "Nhận xét"}
                        {x.note ? `: ${x.note}` : ""}
                      </span>
                      <span className="text-xs text-slate-500">· {REPORT_LABEL[x.status]}</span>
                      {x.status === "PENDING" && (
                        <form action={deleteReportAction.bind(null, x.id)}>
                          <SubmitButton className="text-xs text-red-600 underline" pendingText="..." confirm="Rút lại ghi nhận này?">
                            Rút lại
                          </SubmitButton>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {r?.status === "APPROVED" ? (
                <p className="mt-2 text-xs text-slate-500">Phiếu đã được thầy/cô duyệt.</p>
              ) : (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-teal-700">+ Nhận xét / bổ sung vi phạm</summary>
                  <ReportForm surveyId={survey.id} studentId={m.id} criteria={criteria} />
                </details>
              )}
            </div>
          );
        })}
      </section>

      <section className="card overflow-x-auto">
        <h2 className="mb-3 font-semibold">Tổng hợp tự chấm của {myGroup}</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Trạng thái</th>
              <th className="text-right">Điểm</th>
            </tr>
          </thead>
          <tbody>
            {groupmates.map((s) => {
              const r = responseOf.get(s.id);
              // Phiếu đã duyệt hiện điểm chính thức, chưa duyệt hiện điểm tự chấm
              const pts = r ? (r.status === "APPROVED" ? r.points : computePoints(survey.baseScore ?? 0, criteria, parseCounts(r.selfCounts))) : null;
              return (
                <tr key={s.id}>
                  <td>
                    {s.user.fullName}
                    {s.id === me.id && <span className="ml-1 text-xs text-slate-500">(em)</span>}
                  </td>
                  <td>
                    {r ? (
                      <Badge className={RESPONSE_STATUS[r.status].style}>{RESPONSE_STATUS[r.status].label}</Badge>
                    ) : (
                      <span className="text-xs text-slate-400">Chưa nộp</span>
                    )}
                  </td>
                  <td className="text-right tabular-nums">{pts ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
