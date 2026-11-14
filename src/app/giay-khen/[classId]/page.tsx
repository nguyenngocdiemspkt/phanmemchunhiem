import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { loadCommendations } from "@/lib/commendation";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Giấy khen – Class Master" };

const VN = 7 * 60 * 60 * 1000;
function vnDateLine(d: Date) {
  const l = new Date(d.getTime() + VN);
  return `Ngày ${l.getUTCDate()} tháng ${l.getUTCMonth() + 1} năm ${l.getUTCFullYear()}`;
}

/**
 * Giấy khen điện tử cho bạn được bình chọn tuyên dương tháng / học kỳ (kỳ đã chốt).
 * ?ky=thang-2026-11 | hocky-HK1, &hs=<studentId> (học sinh chỉ xem được giấy khen của mình; GV in được cả kỳ).
 */
export default async function CertificatePage({ params, searchParams }: { params: Promise<{ classId: string }>; searchParams: Promise<{ ky?: string; hs?: string }> }) {
  const { classId } = await params;
  const { ky = "", hs } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  const classroom = await prisma.classroom.findUnique({ where: { id: classId }, include: { homeroomTeacher: { select: { fullName: true } } } });
  if (!classroom) notFound();
  const isTeacher = user.role === "ADMIN" || (user.role === "TEACHER" && classroom.homeroomTeacherId === user.id);
  const isStudent = user.role === "STUDENT" && user.student?.classId === classId;
  if (!isTeacher && !isStudent) notFound();
  const only = isStudent ? user.student!.id : hs;

  const year = await prisma.schoolYear.findUnique({ where: { name: classroom.schoolYear } });
  const data = await loadCommendations(classId, year);
  const m = ky.match(/^(thang|hocky)-(.+)$/);
  const period = m ? (m[1] === "thang" ? data.months : data.semesters).find((p) => p.key === m[2]) : undefined;
  if (!period) notFound();
  const winners = period.winners.filter((w) => !only || w.studentId === only);

  if (!period.done || winners.length === 0) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center text-slate-600">
        {!period.done ? `${period.label} chưa kết thúc, giấy khen có khi kết quả được chốt.` : "Không có giấy khen cho kỳ này."}
      </main>
    );
  }

  // Lời khen của các bạn dành cho từng bạn trong kỳ (ẩn danh)
  const praises = await prisma.commendationVote.findMany({
    where: {
      classId,
      nomineeId: { in: winners.map((w) => w.studentId) },
      weekStart: { gte: period.startsAt, lt: period.endsAt },
      reason: { not: null },
    },
    orderBy: { weekStart: "desc" },
    select: { nomineeId: true, reason: true },
  });
  const kindLabel = m![1] === "thang" ? period.label.toLowerCase() : period.label.charAt(0).toLowerCase() + period.label.slice(1);

  return (
    <div className="cert-root bg-slate-100 py-6 print:bg-white print:py-0">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        .cert-serif { font-family: "Times New Roman", "Noto Serif", "DejaVu Serif", "Liberation Serif", serif; }
        @media print { .no-print { display: none !important; } .cert { break-after: page; box-shadow: none !important; margin: 0 !important; } }
      `}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[297mm] items-center justify-between px-2 text-sm text-slate-600">
        <span>
          {winners.length} giấy khen · {period.label}. Bấm In, chọn máy in hoặc “Lưu dưới dạng PDF”, khổ A4 ngang.
        </span>
        <PrintButton />
      </div>
      {winners.map((w) => {
        const quotes = [...new Set(praises.filter((p) => p.nomineeId === w.studentId).map((p) => p.reason!.trim()))].slice(0, 3).map((reason) => ({ reason }));
        return (
          <section
            key={w.studentId}
            className="cert relative mx-auto mb-6 flex h-[210mm] w-[297mm] flex-col items-center justify-center bg-white p-[14mm] text-center shadow-lg"
            data-testid="certificate"
          >
            <div className="absolute inset-[8mm] rounded-sm border-[3px] border-amber-600" />
            <div className="absolute inset-[11mm] rounded-sm border border-amber-500" />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-between py-6">
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-teal-800">
                Tập thể lớp {classroom.name} · Năm học {classroom.schoolYear}
              </div>
              <div>
                <div className="cert-serif text-6xl font-bold tracking-wide text-red-700">GIẤY KHEN</div>
                <div className="mt-3 text-lg italic text-slate-600">Trân trọng tuyên dương em</div>
                <div className="cert-serif mt-2 text-5xl font-bold text-teal-900">{w.name}</div>
                <div className="mx-auto mt-5 max-w-[210mm] text-xl leading-relaxed text-slate-800">
                  Đã được các bạn trong lớp bình chọn tuyên dương <b>{kindLabel}</b>
                  <br />
                  <span className="text-base text-slate-600">
                    ({w.wins} lần được tuyên dương tuần, {w.votes} phiếu bầu của các bạn)
                  </span>
                </div>
                {quotes.length > 0 && (
                  <div className="mx-auto mt-4 max-w-[220mm] space-y-1 text-base italic text-slate-600">
                    {quotes.map((q, i) => (
                      <div key={i}>“{q.reason}”</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex w-full items-end justify-between px-[10mm] text-base">
                <div className="text-left text-sm text-slate-500">⭐ Class Master · Bình chọn tuyên dương</div>
                <div className="text-center">
                  <div className="italic text-slate-600">{vnDateLine(period.endsAt.getTime() < Date.now() ? new Date() : period.endsAt)}</div>
                  <div className="mt-1 font-semibold">GIÁO VIÊN CHỦ NHIỆM</div>
                  <div className="h-[22mm]" />
                  <div className="font-semibold">{classroom.homeroomTeacher?.fullName ?? ""}</div>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
