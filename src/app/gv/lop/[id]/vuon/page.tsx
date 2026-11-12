import { requireClassAccess } from "@/lib/auth";
import { pickThresholds, plantLabel, SEEDS } from "@/lib/garden";
import { loadGarden } from "@/lib/gardenService";
import { Badge } from "@/components/ui";
import { GardenMap } from "@/components/garden/GardenMap";
import { GardenSettingsForm } from "@/components/garden/GardenSettingsForm";
import { resetGardenToPresetAction, saveGardenSettingsAction } from "@/lib/gardenActions";

export default async function ClassGardenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireClassAccess(id);
  const { classroom, cycle, plots, size } = await loadGarden(id);
  const planted = plots.filter((p) => p.seed).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        {cycle.label} · {planted}/{plots.length} học sinh đã gieo hạt. Bấm vào ô đất để xem cây của từng em.
      </p>
      <GardenMap classId={id} className={classroom.name} plots={plots} meId={null} size={size} thresholds={pickThresholds(classroom)} />

      <div className="card overflow-x-auto p-0 sm:p-0">
        <table className="table">
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Hạt giống</th>
              <th>Cây</th>
              <th className="text-right">Điểm vườn</th>
            </tr>
          </thead>
          <tbody>
            {[...plots]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.seed ? SEEDS[p.seed]?.name : <span className="text-slate-400">Chưa gieo</span>}</td>
                  <td>
                    {p.seed ? (
                      <Badge className={p.state.wilt ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200"}>
                        {plantLabel(p.state, SEEDS[p.seed]?.fruitName)}
                      </Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className={`text-right font-semibold tabular-nums ${p.state.wilt ? "text-red-600" : ""}`}>{p.score}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-semibold">Cài đặt vườn lớp</summary>
        <div className="mt-4">
          <p className="mb-3 text-sm text-slate-500">
            Lớp được tạo với bộ cấu hình chuẩn của hệ thống. Thầy/cô chỉnh riêng cho lớp nếu muốn, hoặc bấm &quot;Dùng lại bộ chuẩn&quot; để quay về.
          </p>
          <GardenSettingsForm
            save={saveGardenSettingsAction.bind(null, id)}
            reset={resetGardenToPresetAction.bind(null, id)}
            initial={{ gardenCycle: classroom.gardenCycle, ...pickThresholds(classroom) }}
          />
        </div>
      </details>
    </div>
  );
}
