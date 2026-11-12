import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { pickThresholds, plantLabel, SEEDS, type PlantState } from "@/lib/garden";
import { loadGarden } from "@/lib/gardenService";
import { PageHeader } from "@/components/ui";
import { ArtBox, Plant } from "@/components/garden/Art";
import { CharacterCreator } from "@/components/garden/CharacterCreator";
import { GardenMap } from "@/components/garden/GardenMap";
import { SeedPicker } from "@/components/garden/SeedPicker";

/** Hình cây lúc thu hoạch, dựng lại từ số lá/trái/mức héo đã lưu */
function harvestState(h: { leaves: number; fruits: number; wilt: number }): PlantState {
  const phase = h.wilt === 2 ? "dry" : h.wilt === 1 ? "wilt" : h.fruits > 0 ? "mature" : h.leaves >= 2 ? "growing" : h.leaves === 1 ? "sprout" : "seed";
  return { phase, leaves: h.leaves, fruits: h.fruits, wilt: h.wilt };
}

export default async function StudentGardenPage() {
  const { student } = await requireStudent();
  const { classroom, cycle, plots, layout } = await loadGarden(student.classId);
  const mine = plots.find((p) => p.id === student.id);
  const harvests = await prisma.gardenHarvest.findMany({ where: { studentId: student.id }, orderBy: { createdAt: "desc" } });

  // Lần đầu: tạo nhân vật trước
  if (!mine?.hasCharacter) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Tạo nhân vật của em" subtitle="Nhân vật đại diện cho em trong vườn lớp. Em có thể đổi lại bất cứ lúc nào." />
        <div className="card">
          <CharacterCreator initial={mine?.character ?? plots[0].character} firstTime />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Vườn lớp ${classroom.name}`}
        subtitle={`${cycle.label} · Mỗi bạn chăm một cây, cả lớp cùng làm nên khu vườn chung`}
        actions={
          <Link href="/hs/vuon/nhan-vat" className="btn-secondary btn-sm">
            Đổi nhân vật
          </Link>
        }
      />
      {!mine.seed && (
        <div className="card">
          <SeedPicker cycleLabel={cycle.label} />
        </div>
      )}
      <GardenMap
        classId={classroom.id}
        className={classroom.name}
        // Cả lớp xem được điểm vườn và việc tốt của nhau (không có điểm trừ từng tuần, nhận xét của GV)
        plots={plots}
        meId={student.id}
        layout={layout}
        thresholds={pickThresholds(classroom)}
      />
      {harvests.length > 0 && (
        <div className="card">
          <h2 className="mb-3 font-semibold">Bộ sưu tập của em</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {harvests.map((h) => (
              <div key={h.id} className="flex flex-col items-center rounded-xl bg-emerald-50 p-3 text-center">
                <ArtBox size={64}>
                  <Plant seed={h.seedType} state={harvestState(h)} />
                </ArtBox>
                <div className="text-sm font-medium">{SEEDS[h.seedType]?.name}</div>
                <div className="text-xs text-slate-600">{h.cycleLabel}</div>
                <div className="text-xs text-slate-500">
                  {plantLabel(harvestState(h), SEEDS[h.seedType]?.fruitName)} · {h.score} điểm
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
