"use client";

import { useActionState, useEffect } from "react";
import type { GardenThresholds } from "@/lib/garden";
import type { GardenState } from "@/lib/gardenActions";
import { FormMessage } from "@/components/ui";

type Settings = GardenThresholds & { gardenCycle: "SEMESTER" | "YEAR" };

const FIELDS: [keyof GardenThresholds, string, string][] = [
  ["gardenStart", "Điểm khởi đầu", "Mỗi học sinh bắt đầu chu kỳ ở mức này, cây là hạt giống"],
  ["gardenWilt", "Héo khi dưới", "Dưới mức này cây bị héo"],
  ["gardenDry", "Khô lá khi dưới", "Dưới mức này cây khô lá"],
  ["gardenSprout", "Nảy mầm từ", "Đạt mức này hạt nảy mầm"],
  ["gardenTwoLeaves", "Có 2 lá từ", "Đạt mức này cây có 2 lá"],
  ["gardenLeafStep", "Thêm 1 lá mỗi", "Sau mốc 2 lá, cứ thêm chừng này điểm cây có thêm 1 lá"],
  ["gardenMature", "Trưởng thành, ra trái từ (N)", "Đạt mức này cây trưởng thành và ra trái đầu tiên"],
  ["gardenFruitStep", "Thêm 1 trái mỗi (M)", "Vượt mốc trưởng thành, cứ thêm chừng này điểm cây có thêm 1 trái"],
];

/**
 * Form tham số vườn. Dùng cho bộ chuẩn của hệ thống (quản trị) và cài đặt riêng của lớp (GVCN).
 * reset: nút đưa về bộ chuẩn (chỉ ở trang của lớp).
 */
export function GardenSettingsForm({
  save,
  reset,
  initial,
  submitLabel = "Lưu cài đặt vườn",
}: {
  save: (prev: GardenState, formData: FormData) => Promise<GardenState>;
  reset?: (prev: GardenState) => Promise<GardenState>;
  initial: Settings;
  submitLabel?: string;
}) {
  const [state, action, pending] = useActionState(save, null);
  const [resetState, resetAction, resetting] = useActionState(reset ?? (async () => null), null);
  // Đã về bộ chuẩn: tải lại để các ô hiện giá trị mới
  useEffect(() => {
    if (resetState?.ok) window.location.reload();
  }, [resetState]);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label">Thu hoạch (kết thúc một chu kỳ trồng cây)</label>
        <select name="gardenCycle" defaultValue={initial.gardenCycle} className="input w-auto">
          <option value="SEMESTER">Mỗi học kỳ</option>
          <option value="YEAR">Cuối năm học</option>
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map(([k, label, hint]) => (
          <div key={k}>
            <label className="label" title={hint}>
              {label}
            </label>
            <div className="flex items-center gap-1">
              <input name={k} type="number" min={0} defaultValue={initial[k]} className="input w-24" required title={hint} />
              <span className="text-xs text-slate-500">điểm</span>
            </div>
            <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{hint}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Điểm vườn = điểm khởi đầu + tổng (điểm tuần đã duyệt − điểm gốc) + điểm việc tốt trong chu kỳ. Ví dụ mặc định: bắt đầu 100, dưới 80 héo,
        dưới 70 khô lá, 105 nảy mầm, 110 có 2 lá, mỗi 3 điểm thêm 1 lá, 140 ra trái, vượt 140 mỗi 5 điểm thêm 1 trái.
      </p>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : submitLabel}
        </button>
        {reset && (
          <button
            type="submit"
            formAction={resetAction}
            formNoValidate
            className="btn-secondary"
            disabled={resetting}
            onClick={(e) => {
              if (!confirm("Đưa toàn bộ cài đặt vườn của lớp về bộ chuẩn của hệ thống?")) e.preventDefault();
            }}
          >
            {resetting ? "Đang áp dụng..." : "Dùng lại bộ chuẩn của hệ thống"}
          </button>
        )}
        <FormMessage state={state} />
        <FormMessage state={resetState} />
      </div>
    </form>
  );
}
