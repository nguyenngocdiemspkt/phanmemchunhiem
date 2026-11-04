import { requireStudent } from "@/lib/auth";
import { weekRange } from "@/lib/format";
import { loadEmulationBoard, requireEmulationAccess } from "@/lib/emulation";
import { EmulationBoard } from "@/components/emulation/EmulationBoard";

export default async function StudentEmulationPage({ searchParams }: { searchParams: Promise<{ tuan?: string }> }) {
  const { student } = await requireStudent();
  const { user, classroom, level } = await requireEmulationAccess(student.classId);
  const week = weekRange((await searchParams).tuan);
  const data = await loadEmulationBoard(student.classId, classroom.groupCount, week);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Thi đua giữa các tổ</h1>
        <p className="text-sm text-slate-500">
          Lớp {classroom.name}
          {student.groupNo ? ` · Em thuộc tổ ${student.groupNo}` : ""}
          {level === "monitor" ? " · Em là cán sự, được ghi điểm thi đua" : ""}
        </p>
      </div>
      <EmulationBoard
        classId={student.classId}
        groupCount={classroom.groupCount}
        data={data}
        week={week}
        level={level}
        userId={user.id}
        basePath="/hs/thi-dua"
        ownGroup={student.groupNo}
      />
    </div>
  );
}
