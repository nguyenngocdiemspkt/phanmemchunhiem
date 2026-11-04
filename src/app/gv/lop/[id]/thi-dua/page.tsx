import Link from "next/link";
import { weekRange } from "@/lib/format";
import { loadEmulationBoard, requireEmulationAccess } from "@/lib/emulation";
import { EmulationBoard } from "@/components/emulation/EmulationBoard";

export default async function ClassEmulationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tuan?: string }>;
}) {
  const { id } = await params;
  const { user, classroom, level } = await requireEmulationAccess(id);
  const week = weekRange((await searchParams).tuan);
  const data = await loadEmulationBoard(id, classroom.groupCount, week);
  const monitors = data.students.filter((s) => s.isMonitor);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {classroom.groupCount} tổ ·{" "}
          {monitors.length ? `Cán sự được ghi điểm: ${monitors.map((m) => m.name).join(", ")}` : "Chưa chỉ định cán sự ghi điểm"}
        </p>
        <Link href={`/gv/lop/${id}/thi-dua/cai-dat`} className="btn-secondary btn-sm">
          ⚙ Phân tổ, cán sự & danh mục
        </Link>
      </div>
      <EmulationBoard
        classId={id}
        groupCount={classroom.groupCount}
        data={data}
        week={week}
        level={level}
        userId={user.id}
        basePath={`/gv/lop/${id}/thi-dua`}
      />
    </div>
  );
}
