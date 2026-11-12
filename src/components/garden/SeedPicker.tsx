"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SEEDS } from "@/lib/garden";
import { chooseSeedAction } from "@/lib/gardenActions";
import { ArtBox, Plant } from "./Art";

/** Chọn hạt giống cho chu kỳ mới: mỗi loại xem trước hình lúc kết trái */
export function SeedPicker({ cycleLabel }: { cycleLabel: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div>
      <h2 className="text-lg font-semibold">Chọn hạt giống cho {cycleLabel}</h2>
      <p className="mb-4 text-sm text-slate-500">
        Mỗi tuần em được duyệt phiếu, điểm cộng/trừ và việc tốt sẽ nuôi cây lớn lên: nảy mầm, ra lá, rồi trưởng thành và ra trái. Điểm
        giảm nhiều thì cây héo. Hết chu kỳ, cây được thu hoạch vào bộ sưu tập của em.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.entries(SEEDS).map(([key, s]) => (
          <button
            key={key}
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await chooseSeedAction(key);
                if (r?.error) setError(r.error);
                else router.refresh();
              })
            }
            className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 hover:border-teal-500 hover:bg-teal-50 disabled:opacity-50"
          >
            <ArtBox size={72}>
              <Plant seed={key} state={{ phase: "mature", leaves: 10, fruits: 4, wilt: 0 }} />
            </ArtBox>
            <span className="font-medium">{s.name}</span>
            <span className="text-xs text-slate-500">Kết {s.fruitName}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
