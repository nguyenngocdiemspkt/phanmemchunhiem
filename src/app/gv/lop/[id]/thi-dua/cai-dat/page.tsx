import Link from "next/link";
import { requireClassAccess } from "@/lib/auth";
import { ensureCategories } from "@/lib/emulation";
import { prisma } from "@/lib/db";
import { CategoryEditor, GroupsForm } from "./SettingsForms";

export default async function EmulationSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { classroom } = await requireClassAccess(id);
  const [students, categories] = await Promise.all([
    prisma.student.findMany({
      where: { classId: id },
      select: { id: true, groupNo: true, isMonitor: true, user: { select: { fullName: true, active: true } } },
    }),
    ensureCategories(id),
  ]);
  const lastWord = (s: string) => s.trim().split(/\s+/).at(-1) ?? s;
  students.sort(
    (a, b) =>
      lastWord(a.user.fullName).localeCompare(lastWord(b.user.fullName), "vi") ||
      a.user.fullName.localeCompare(b.user.fullName, "vi"),
  );

  return (
    <div className="space-y-6">
      <Link href={`/gv/lop/${id}/thi-dua`} className="text-sm text-slate-500 hover:text-teal-700">
        ← Về bảng thi đua
      </Link>

      <div className="card">
        <h2 className="mb-1 font-semibold">Phân tổ và cán sự lớp</h2>
        <p className="mb-4 text-sm text-slate-500">
          Đánh dấu <b>Cán sự</b> cho các em được ghi điểm thi đua (lớp trưởng, lớp phó, tổ trưởng, cờ đỏ...). Cán sự chỉ ghi được
          trong tuần hiện tại và chỉ xóa được điểm do mình ghi.
        </p>
        {students.length === 0 ? (
          <p className="text-sm text-slate-500">Lớp chưa có học sinh.</p>
        ) : (
          <GroupsForm
            classId={id}
            groupCount={classroom.groupCount}
            students={students.map((s) => ({
              id: s.id,
              name: s.user.fullName,
              active: s.user.active,
              groupNo: s.groupNo,
              isMonitor: s.isMonitor,
            }))}
          />
        )}
      </div>

      <div className="card">
        <h2 className="mb-1 font-semibold">Danh mục cộng / trừ điểm</h2>
        <p className="mb-4 text-sm text-slate-500">
          Điểm dương là điểm cộng, điểm âm là điểm trừ. Sửa danh mục không làm thay đổi các điểm đã ghi trước đó.
        </p>
        <CategoryEditor classId={id} initial={categories.map((c) => ({ name: c.name, points: c.points }))} />
      </div>
    </div>
  );
}
