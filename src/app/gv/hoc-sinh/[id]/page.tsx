import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudentAccess } from "@/lib/auth";
import { fmtDate, fmtDateTime, fmtShortDate, surveyStatus, toDateInput } from "@/lib/format";
import { studentFlags } from "@/lib/insights";
import { NOTE_TYPE } from "@/lib/notes";
import { Badge, FlagList, PageHeader, Stat } from "@/components/ui";
import { LineChartCard } from "@/components/LineChartCard";
import { SubmitButton } from "@/components/SubmitButton";
import { AddNoteForm, ProfileForm } from "./StudentForms";
import { deleteNoteAction } from "./actions";
import { ensureParentTokens, parentLink, siteUrl } from "@/lib/parent";
import { regenerateParentLinkAction } from "@/lib/parentActions";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { student } = await requireStudentAccess(id);
  const now = new Date();

  const [surveys, notes] = await Promise.all([
    prisma.survey.findMany({
      where: { classId: student.classId, openAt: { lte: now } },
      orderBy: { openAt: "asc" },
      select: {
        id: true,
        title: true,
        openAt: true,
        closeAt: true,
        questions: true,
        responses: { where: { studentId: id }, include: { feedback: true } },
      },
    }),
    prisma.note.findMany({ where: { studentId: id }, orderBy: { date: "desc" }, include: { author: { select: { fullName: true } } } }),
  ]);

  let previous: (typeof surveys)[number]["responses"][number] | undefined;
  const history = surveys.map((s) => {
    const r = s.responses[0];
    const flags = studentFlags({ questions: s.questions, current: r, previous });
    if (r) previous = r;
    return { survey: s, response: r, flags };
  });
  const submitted = history.filter((h) => h.response);
  const scores = submitted.map((h) => h.response!.score).filter((x): x is number => x != null);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const trend = scores.length >= 2 ? scores.at(-1)! - scores.at(-2)! : null;
  const parentUrl = parentLink(await siteUrl(), (await ensureParentTokens([student])).get(student.id)!);

  return (
    <>
      <PageHeader
        title={student.user.fullName}
        subtitle={`Lớp ${student.classroom.name} · ${student.user.username}`}
        back={{ href: `/gv/lop/${student.classId}/hoc-sinh`, label: `Học sinh lớp ${student.classroom.name}` }}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Số phiếu đã nộp" value={`${submitted.length}/${surveys.length}`} />
          <Stat label="Mức tự đánh giá TB" value={avg != null ? `${avg}%` : "—"} />
          <Stat
            label="So với đợt trước"
            value={trend == null ? "—" : <span className={trend >= 0 ? "text-emerald-700" : "text-amber-700"}>{trend >= 0 ? `+${trend}` : trend}</span>}
          />
          <Stat label="Ghi nhận tích cực" value={notes.filter((n) => n.type === "POSITIVE").length} />
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold">Biểu đồ tiến bộ</h2>
          <LineChartCard
            data={submitted.map((h) => ({ label: fmtShortDate(h.survey.openAt), score: h.response!.score }))}
            series={[{ key: "score", name: "Mức tự đánh giá", color: "#0f766e" }]}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="mb-3 font-semibold">Lịch sử tự đánh giá</h2>
            {history.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có đợt nào.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {[...history].reverse().map(({ survey, response, flags }) => (
                  <li key={survey.id} className="py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/gv/dot/${survey.id}/hs/${id}`} className="link">
                        {survey.title}
                      </Link>
                      {response ? (
                        <span className="text-sm">
                          {response.score != null ? `${response.score}%` : ""}{" "}
                          {response.feedback?.published ? (
                            <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-200">Đã nhận xét</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Chưa nhận xét</Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">{surveyStatus(survey, now) === "open" ? "Chưa nộp (đang mở)" : "Không nộp"}</span>
                      )}
                    </div>
                    {response && <div className="text-xs text-slate-500">Nộp lúc {fmtDateTime(response.submittedAt)}</div>}
                    {flags.length > 0 && (
                      <div className="mt-1">
                        <FlagList flags={flags} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold">Ghi nhận hành động & chuyển biến</h2>
            <AddNoteForm studentId={id} today={toDateInput(now)} />
            <ul className="mt-4 divide-y divide-slate-100">
              {notes.map((n) => (
                <li key={n.id} className="py-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge className={NOTE_TYPE[n.type].style}>{NOTE_TYPE[n.type].label}</Badge>
                    <span className="text-xs text-slate-500">
                      {fmtDate(n.date)}
                      {n.author ? ` · ${n.author.fullName}` : ""}
                      {!n.visibleToStudent && " · chỉ GV thấy"}
                    </span>
                    <form action={deleteNoteAction.bind(null, id, n.id)} className="ml-auto">
                      <SubmitButton className="text-xs text-slate-400 hover:text-red-600" pendingText="..." confirm="Xóa ghi nhận này?">
                        Xóa
                      </SubmitButton>
                    </form>
                  </div>
                  <p className="whitespace-pre-line">{n.content}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <details className="card">
          <summary className="cursor-pointer font-semibold">Thông tin cá nhân</summary>
          <div className="mt-4">
            <ProfileForm
              studentId={id}
              profile={{
                fullName: student.user.fullName,
                studentCode: student.studentCode ?? "",
                dateOfBirth: student.dateOfBirth ?? "",
                gender: student.gender ?? "",
                address: student.address ?? "",
                parentName: student.parentName ?? "",
                parentPhone: student.parentPhone ?? "",
              }}
            />
          </div>
        </details>

        <div className="card">
          <h2 className="mb-1 font-semibold">Link cho phụ huynh</h2>
          <p className="mb-3 text-sm text-slate-500">
            Phụ huynh mở link này để xem các phiếu tự đánh giá đã được thầy/cô nhận xét, không cần tài khoản. Link được gửi kèm khi bấm
            &quot;Nhắn SMS&quot; ở trang nhận xét.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly value={parentUrl} className="input max-w-xl flex-1 font-mono text-xs" />
            <a href={parentUrl} target="_blank" className="btn-secondary btn-sm">
              Xem thử
            </a>
            <form action={regenerateParentLinkAction.bind(null, id)}>
              <SubmitButton
                className="btn-danger btn-sm"
                pendingText="..."
                confirm="Tạo link mới? Link cũ đã gửi phụ huynh sẽ không mở được nữa (dùng khi lỡ gửi nhầm người)."
              >
                Đổi link
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
