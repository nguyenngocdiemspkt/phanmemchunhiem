import Link from "next/link";
import { groupName, RESPONSE_STATUS } from "@/lib/scoring";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { fmtDateTime, surveyStatus } from "@/lib/format";
import { Badge, StatusBadge } from "@/components/ui";
import { FeedbackCard, goalsOf } from "@/components/FeedbackCard";
import { PushToggle } from "@/components/PushToggle";
import { pushPublicKey } from "@/lib/push";

export default async function StudentHome({ searchParams }: { searchParams: Promise<{ "da-nop"?: string }> }) {
  const { user, student } = await requireStudent();
  const justSubmitted = (await searchParams)["da-nop"] === "1";
  const now = new Date();

  const [surveys, latestFeedback] = await Promise.all([
    prisma.survey.findMany({
      // Phiếu còn hạn + phiếu thầy/cô yêu cầu sửa (kể cả đã hết hạn)
      where: {
        classId: student.classId,
        OR: [{ closeAt: { gte: now } }, { responses: { some: { studentId: student.id, status: "REVISION" } } }],
      },
      orderBy: { closeAt: "asc" },
      select: {
        id: true,
        title: true,
        openAt: true,
        closeAt: true,
        responses: { where: { studentId: student.id }, select: { id: true, status: true } },
      },
    }),
    prisma.feedback.findFirst({
      where: { published: true, content: { not: "" }, response: { studentId: student.id } },
      orderBy: { publishedAt: "desc" },
      include: { response: { select: { survey: { select: { title: true } } } }, teacher: { select: { fullName: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Chào {user.fullName.split(" ").at(-1)}! 👋</h1>
        <p className="text-sm text-slate-500">Lớp {student.classroom.name}</p>
      </div>

      <PushToggle publicKey={pushPublicKey()} compact />

      {justSubmitted && (
        <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Em đã gửi phiếu tự đánh giá thành công. Thầy/cô sẽ đọc và phản hồi cho em sớm nhé!
        </p>
      )}

      {student.isGroupLeader && student.groupNo && (
        <Link href="/hs/to-truong" className="card block border-violet-200 bg-violet-50 hover:bg-violet-100">
          <div className="font-semibold text-violet-900">Em là tổ trưởng {groupName(student.classroom.groupNames, student.groupNo)}</div>
          <div className="text-sm text-violet-800">Xem bảng tự chấm điểm của lớp, nhận xét và bổ sung vi phạm cho tổ viên →</div>
        </Link>
      )}

      <section className="card">
        <h2 className="mb-3 font-semibold">Phiếu tự đánh giá</h2>
        {surveys.length === 0 ? (
          <p className="text-sm text-slate-500">Hiện chưa có phiếu nào cần làm.</p>
        ) : (
          <ul className="space-y-3">
            {surveys.map((s) => {
              const status = surveyStatus(s, now);
              const done = s.responses.length > 0;
              const rs = s.responses[0]?.status;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-slate-500">
                      {status === "upcoming" ? `Mở lúc ${fmtDateTime(s.openAt)}` : `Hạn nộp ${fmtDateTime(s.closeAt)}`}
                    </div>
                  </div>
                  {rs === "REVISION" ? (
                    <div className="flex items-center gap-2">
                      <Badge className={RESPONSE_STATUS.REVISION.style}>Thầy/cô nhờ em sửa</Badge>
                      <Link href={`/hs/phieu/${s.id}`} className="btn-primary btn-sm">
                        Sửa phiếu
                      </Link>
                    </div>
                  ) : status === "open" ? (
                    <div className="flex items-center gap-2">
                      {rs && <Badge className={RESPONSE_STATUS[rs].style}>{rs === "SUBMITTED" ? "Đã nộp, chờ duyệt" : RESPONSE_STATUS[rs].label}</Badge>}
                      <Link href={`/hs/phieu/${s.id}`} className={done ? "btn-secondary btn-sm" : "btn-primary"}>
                        {!done ? "Làm phiếu" : rs === "APPROVED" ? "Xem kết quả" : "Xem / sửa"}
                      </Link>
                    </div>
                  ) : (
                    <StatusBadge status={status} />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Phản hồi mới nhất từ thầy/cô</h2>
        {latestFeedback ? (
          <FeedbackCard
            title={latestFeedback.response.survey.title}
            content={latestFeedback.content}
            goals={goalsOf(latestFeedback.goals)}
            teacher={latestFeedback.teacher?.fullName}
            date={latestFeedback.publishedAt}
          />
        ) : (
          <p className="card text-sm text-slate-500">Chưa có phản hồi nào.</p>
        )}
        <div className="mt-3 text-right">
          <Link href="/hs/hanh-trinh" className="link text-sm">
            Xem hành trình tiến bộ của em →
          </Link>
        </div>
      </section>
    </div>
  );
}
