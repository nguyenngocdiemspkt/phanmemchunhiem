"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ACC_LABEL, ACCS, HAIR_COLORS, HAIR_LABEL, HAIRS, PANTS, SHIRTS, SKINS, type Character } from "@/lib/garden";
import { saveCharacterAction, type GardenState } from "@/lib/gardenActions";
import { FormMessage } from "@/components/ui";
import { ArtBox, Person } from "./Art";

function Swatches({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex flex-wrap gap-2">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${c}`}
            aria-pressed={c === value}
            onClick={() => onChange(c)}
            className={`size-8 rounded-full ring-offset-2 ${c === value ? "ring-2 ring-teal-600" : "ring-1 ring-slate-300"}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function Choices<T extends string>({ label, options, labels, value, onChange }: { label: string; options: readonly T[]; labels: Record<T, string>; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} type="button" onClick={() => onChange(o)} className={o === value ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
            {labels[o]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Trình tạo nhân vật đại diện của học sinh trong vườn lớp */
export function CharacterCreator({ initial, firstTime }: { initial: Character; firstTime: boolean }) {
  const [c, setC] = useState<Character>(initial);
  const [state, setState] = useState<GardenState>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (patch: Partial<Character>) => setC({ ...c, ...patch });

  return (
    <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-2xl bg-gradient-to-b from-sky-100 to-emerald-100 p-4">
          <ArtBox size={140}>
            <Person c={c} />
          </ArtBox>
        </div>
        <span className="text-xs text-slate-500">Xem trước</span>
      </div>
      <div className="space-y-4">
        <Swatches label="Màu da" colors={SKINS} value={c.skin} onChange={(skin) => set({ skin })} />
        <Choices label="Kiểu tóc" options={HAIRS} labels={HAIR_LABEL} value={c.hair} onChange={(hair) => set({ hair })} />
        <Swatches label="Màu tóc" colors={HAIR_COLORS} value={c.hairColor} onChange={(hairColor) => set({ hairColor })} />
        <Swatches label="Màu áo" colors={SHIRTS} value={c.shirt} onChange={(shirt) => set({ shirt })} />
        <Swatches label="Màu quần" colors={PANTS} value={c.pants} onChange={(pants) => set({ pants })} />
        <Choices label="Phụ kiện" options={ACCS} labels={ACC_LABEL} value={c.acc} onChange={(acc) => set({ acc })} />
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-primary"
            disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set("character", JSON.stringify(c));
              // Gọi thẳng action để đợi lưu xong rồi mới về vườn
              start(async () => {
                const result = await saveCharacterAction(null, fd);
                setState(result);
                if (result?.ok) {
                  router.push("/hs/vuon");
                  router.refresh();
                }
              });
            }}
          >
            {pending ? "Đang lưu..." : firstTime ? "Xong, vào vườn lớp" : "Lưu nhân vật"}
          </button>
          <FormMessage state={state} />
        </div>
      </div>
    </div>
  );
}
