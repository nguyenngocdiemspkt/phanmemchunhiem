import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { addDays, fmtDateTime, toLocalInput } from "@/lib/format";
import { POLL_STATUS, pollStatus } from "@/lib/polls";
import { Badge, Empty } from "@/components/ui";
import { CreatePollForm } from "@/components/PollForms";
import { CommendationBoard } from "@/components/CommendationBoard";
import { CommendPointsForm, CopyText } from "@/components/CommendationForms";
import { SubmitButton } from "@/components/SubmitButton";
import { loadCommendations, weekLabel } from "@/lib/commendation";
import { deleteCommendationVoteAction } from "@/lib/commendationActions";
import { weekRange } from "@/lib/format";

export default async function ClassPollsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tuan?: string }> }) {
  const { id } = await params;
  const { tuan } = await searchParams;
  const { classroom } = await requireClassAccess(id);
  const [polls, studentCount] = await Promise.all([
    prisma.poll.findMany({ where: { classId: id }, orderBy: { startAt: "desc" }, include: { _count: { select: { votes: true, options: true } } } }),
    prisma.student.count({ where: { classId: id, status: "ACTIVE" } }),
  ]);
  const now = new Date();

  // Tuyên dương: bảng vàng + chi tiết một tuần (mặc định tuần hiện tại)
  const year = await prisma.schoolYear.findUnique({ where: { name: classroom.schoolYear } });
  const commend = await loadCommendations(id, year, now);
  const week = weekRange(tuan);
  const isCurrent = week.start.getTime() === commend.currentWeek.getTime();
  const [weekVotes, activeStudents] = await Promise.all([
    prisma.commendationVote.findMany({
      where: { classId: id, weekStart: week.start },
      orderBy: { updatedAt: "asc" },
      select: {
        id: true,
        nomineeId: true,
        reason: true,
        voter: { select: { id: true, user: { select: { fullName: true } } } },
        nominee: { select: { user: { select: { fullName: true } } } },
      },
    }),
    prisma.student.findMany({ where: { classId: id, status: "ACTIVE" }, select: { id: true, user: { select: { fullName: true } } }, orderBy: { studentCode: "asc" } }),
  ]);
  const groups = new Map<string, { name: string; votes: typeof weekVotes }>();
  for (const v of weekVotes) {
    const g = groups.get(v.nomineeId) ?? { name: v.nominee.user.fullName, votes: [] };
    g.votes.push(v);
    groups.set(v.nomineeId, g);
  }
  const ranked = [...groups.entries()].sort((a, b) => b[1].votes.length - a[1].votes.length || a[1].name.localeCompare(b[1].name, "vi"));
  const top = ranked[0]?.[1].votes.length ?? 0;
  const voted = new Set(weekVotes.map((v) => v.voter.id));
  const notVoted = activeStudents.filter((s) => !voted.has(s.id));
  const pastWeeks = [commend.currentWeek, ...commend.weeks.filter((w) => w.done).map((w) => w.start)].slice(0, 10);

  // Tin nhắn soạn sẵn: tuần vừa chốt (kèm lời khen), tháng, học kỳ
  const lastWeek = commend.weeks.find((w) => w.done && w.winners.length);
  const lastPraises = lastWeek
    ? await prisma.commendationVote.findMany({
        where: { classId: id, weekStart: lastWeek.start, nomineeId: { in: lastWeek.winners.map((w) => w.studentId) }, reason: { not: null } },
        select: { reason: true },
        take: 6,
      })
    : [];
  const pts = classroom.commendPoints;
  const messages: { title: string; text: string }[] = [];
  if (lastWeek) {
    messages.push({
      title: `Tuyên dương tuần ${lastWeek.label}`,
      text: [
        `🎉 Lớp ${classroom.name} tuyên dương tuần ${lastWeek.label}: ${lastWeek.winners.map((w) => `${w.name} (${w.votes}/${lastWeek.voters} phiếu bầu của các bạn)`).join(", ")}.`,
        ...(pts ? [`Mỗi bạn được cộng ${pts} điểm thi đua.`] : []),
        ...(lastPraises.length ? ["Lời khen của các bạn:", ...lastPraises.map((p) => `– “${p.reason}”`)] : []),
        "Chúc mừng các em và mong cả lớp tiếp tục cố gắng!",
      ].join("\n"),
    });
  }
  for (const p of [commend.months[0], commend.semesters[0]]) {
    if (!p || !p.winners.length) continue;
    messages.push({
      title: `Tuyên dương ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)}${p.done ? "" : " (tạm tính)"}`,
      text: [
        `🏆 Lớp ${classroom.name} tuyên dương ${p.label.charAt(0).toLowerCase()}${p.label.slice(1)}${p.done ? "" : " (tạm tính)"}: ${p.winners.map((w) => `${w.name} (${w.wins} lần được tuyên dương tuần, ${w.votes} phiếu)`).join(", ")}.`,
        p.done ? "Chúc mừng các em!" : "Kết quả sẽ được chốt khi hết kỳ.",
      ].join("\n"),
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4" data-testid="commend-teacher">
        <div>
          <h2 className="text-lg font-semibold">Bình chọn tuyên dương</h2>
          <p className="text-sm text-slate-500">
            Mỗi tuần, mỗi học sinh bầu 1 bạn (không tự bầu); bạn nhiều phiếu nhất được tuyên dương tuần. Tuyên dương tháng, học kỳ được tính tự động
            từ số lần được tuyên dương tuần (bằng nhau thì xét tổng số phiếu). Học sinh không biết bạn khác bầu cho ai; chỉ thầy/cô thấy chi tiết.
          </p>
        </div>
        <CommendationBoard data={commend} weeksShown={6} classId={id} teacher />
        <div className="card space-y-4">
          <CommendPointsForm classId={id} value={classroom.commendPoints} />
          {messages.length > 0 && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <p className="text-sm text-slate-600">
                Tin nhắn soạn sẵn: bấm <b>Sao chép</b> để dán vào nhóm Zalo phụ huynh/lớp hoặc đọc trong giờ sinh hoạt.
              </p>
              {messages.map((m) => (
                <CopyText key={m.title} title={m.title} text={m.text} />
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold">
              Chi tiết tuần {weekLabel(week.start)} {isCurrent && <Badge className="bg-sky-50 text-sky-800 ring-sky-200">Đang bình chọn</Badge>}
            </h3>
            <div className="flex flex-wrap gap-1 text-xs">
              {pastWeeks.map((w) => (
                <Link
                  key={w.getTime()}
                  href={`/gv/lop/${id}/binh-chon?tuan=${toLocalInput(w).slice(0, 10)}`}
                  className={`rounded px-2 py-1 ${w.getTime() === week.start.getTime() ? "bg-teal-50 font-medium text-teal-800" : "text-slate-600 hover:bg-slate-100"}`}
                >
                  {weekLabel(w).slice(0, 5)}
                </Link>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {voted.size}/{activeStudents.length} học sinh đã bầu.
            {notVoted.length > 0 && <span className="text-slate-500"> Chưa bầu: {notVoted.map((s) => s.user.fullName).join(", ")}.</span>}
          </p>
          {ranked.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Chưa có phiếu nào trong tuần này.</p>
          ) : (
            <table className="table mt-3">
              <thead>
                <tr>
                  <th>Bạn được bầu</th>
                  <th className="w-20 text-right">Số phiếu</th>
                  <th>Người bầu và lý do</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(([sid, g]) => (
                  <tr key={sid}>
                    <td className="font-medium">
                      {g.votes.length === top && "⭐ "}
                      {g.name}
                    </td>
                    <td className="text-right tabular-nums">{g.votes.length}</td>
                    <td>
                      <ul className="space-y-1">
                        {g.votes.map((v) => (
                          <li key={v.id} className="flex items-start justify-between gap-2 text-sm">
                            <span>
                              <span className="text-slate-500">{v.voter.user.fullName}</span>
                              {v.reason && <>: “{v.reason}”</>}
                            </span>
                            <form action={deleteCommendationVoteAction.bind(null, id, v.id)}>
                              <SubmitButton className="text-xs text-red-600 underline" pendingText="..." confirm="Xóa phiếu bầu này?">
                                Xóa
                              </SubmitButton>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <h2 className="pt-2 text-lg font-semibold">Bình chọn khác</h2>
      <div className="card">
        <h2 className="mb-3 font-semibold">Tạo bình chọn mới</h2>
        <CreatePollForm classId={id} defaults={{ startAt: toLocalInput(now), endAt: toLocalInput(addDays(now, 3)) }} />
      </div>

      {polls.length === 0 ? (
        <Empty>Lớp chưa có bình chọn nào.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th>Nội dung</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th className="text-right">Đã bình chọn</th>
              </tr>
            </thead>
            <tbody>
              {polls.map((p) => {
                const st = pollStatus(p, now);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/gv/lop/${id}/binh-chon/${p.id}`} className="link">
                        {p.question}
                      </Link>
                      <div className="text-xs text-slate-500">{p._count.options} lựa chọn</div>
                    </td>
                    <td className="whitespace-nowrap text-xs text-slate-600">
                      {fmtDateTime(p.startAt)} → {fmtDateTime(p.closedAt ?? p.endAt)}
                    </td>
                    <td>
                      <Badge className={POLL_STATUS[st].style}>{p.closedAt ? "Đã đóng sớm" : POLL_STATUS[st].label}</Badge>
                    </td>
                    <td className="text-right tabular-nums">
                      {p._count.votes}/{studentCount}
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
