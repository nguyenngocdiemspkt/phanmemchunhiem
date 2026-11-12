// Hình vẽ SVG của khu vườn lớp: cây theo giai đoạn và nhân vật. Mỗi hình vẽ trong ô 32×32, đáy ở y = 30.
import { SEEDS, type Character, type PlantState } from "@/lib/garden";

/** Trộn màu a với b theo tỉ lệ t (0..1), dùng để làm cây héo ngả màu nâu xám */
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

const WILT_MIX = [0, 0.5, 0.85];
const DRY = "#8b6f47";
const MAX_DRAWN_LEAVES = 16;

/** Cây theo trạng thái: số lá, số trái, mức héo. Hình nằm trong ô 32×32, gốc ở y≈29 (cây lớn có thể vươn quá mép trên). */
export function Plant({ seed, state }: { seed: string; state: PlantState }) {
  const def = SEEDS[seed] ?? SEEDS.sunflower;
  const { phase, fruits, wilt } = state;
  const leaves = Math.min(state.leaves, MAX_DRAWN_LEAVES);
  const t = WILT_MIX[wilt] ?? 0;
  const leaf = mix(def.leaf, DRY, t);
  const stem = mix("#4d7c0f", DRY, t);
  const bloom = mix(def.bloom, DRY, t);
  const center = mix(def.center, DRY, t);
  const fruit = mix(def.fruit, DRY, t);
  // Héo: thân và lá rũ sang một bên
  const droop = wilt ? `rotate(${wilt === 2 ? 28 : 16} 16 28)` : undefined;

  if (phase === "seed") {
    return (
      <g>
        <ellipse cx={16} cy={27} rx={7} ry={3} fill="#7c5a3a" />
        <ellipse cx={16} cy={25.6} rx={2.4} ry={1.7} fill="#a16207" />
        <path d="M16 24.2 q0.6 -1.2 1.4 -1.4" stroke="#65a30d" strokeWidth={0.8} fill="none" />
      </g>
    );
  }

  // Cây ăn trái đủ lớn (từ 7 lá): thân gỗ + tán; còn lại: thân thảo, lá mọc so le dọc thân
  if (def.kind === "tree" && leaves >= 7 && !wilt) {
    const r = 5 + Math.min(leaves, MAX_DRAWN_LEAVES) * 0.32;
    const cy = 22 - r;
    const spots = [
      [-0.45, -0.2],
      [0.45, -0.1],
      [0, 0.35],
      [-0.6, 0.3],
      [0.6, 0.35],
      [-0.1, -0.55],
      [0.3, 0.6],
      [-0.3, 0.65],
      [0.7, -0.4],
      [-0.75, -0.35],
      [0.15, 0.05],
      [-0.25, 0.1],
    ];
    return (
      <g>
        <path d={`M16 29 V${cy + r * 0.6}`} stroke="#78350f" strokeWidth={2 + leaves * 0.12} strokeLinecap="round" />
        <circle cx={16} cy={cy} r={r} fill={leaf} />
        <circle cx={16 - r * 0.55} cy={cy + r * 0.35} r={r * 0.55} fill={mix(leaf, "#000000", 0.12)} />
        <circle cx={16 + r * 0.55} cy={cy + r * 0.35} r={r * 0.55} fill={mix(leaf, "#000000", 0.12)} />
        {phase === "mature" &&
          spots.slice(0, fruits).map(([dx, dy], i) => (
            <circle key={i} cx={16 + dx * r} cy={cy + dy * r} r={1.6 + r * 0.06} fill={fruit} stroke="#00000033" strokeWidth={0.5} />
          ))}
        {phase === "mature" && <circle cx={16 + r * 0.2} cy={cy - r * 0.75} r={1.3} fill={bloom} stroke={center} strokeWidth={0.5} />}
      </g>
    );
  }

  const height = 4 + Math.max(1, leaves) * 1.25;
  const top = 29 - height;
  return (
    <g>
      <g transform={droop}>
        <path d={`M16 29 V${top}`} stroke={stem} strokeWidth={1.4 + Math.min(leaves, 12) * 0.08} strokeLinecap="round" />
        {Array.from({ length: Math.max(1, leaves) }, (_, i) => {
          // Mầm (1 lá) có 2 lá mầm nhỏ đối xứng; từ 2 lá trở lên mọc so le từ dưới lên
          if (leaves <= 1) {
            return (
              <g key={i}>
                <ellipse cx={13.6} cy={top + 1} rx={2.8} ry={1.5} fill={leaf} transform={`rotate(-25 13.6 ${top + 1})`} />
                <ellipse cx={18.4} cy={top + 1} rx={2.8} ry={1.5} fill={leaf} transform={`rotate(25 18.4 ${top + 1})`} />
              </g>
            );
          }
          const y = 27 - (i + 1) * (height - 2) / leaves;
          const left = i % 2 === 0;
          const size = 2.6 + Math.min(1.4, i * 0.08);
          return (
            <ellipse
              key={i}
              cx={left ? 16 - size : 16 + size}
              cy={y}
              rx={size}
              ry={size * 0.48}
              fill={leaf}
              transform={`rotate(${left ? -30 : 30} ${left ? 16 - size : 16 + size} ${y})`}
            />
          );
        })}
        {phase === "mature" && def.kind === "flower" && (
          <g>
            {Array.from({ length: 10 }, (_, i) => (
              <ellipse key={i} cx={16} cy={top - 3.6} rx={1.7} ry={3.6} fill={bloom} transform={`rotate(${i * 36} 16 ${top})`} />
            ))}
            <circle cx={16} cy={top} r={2.6} fill={center} />
          </g>
        )}
      </g>
      {phase === "mature" &&
        def.kind === "flower" &&
        // Trái của cây hoa: bông/hạt nhỏ quanh gốc theo số trái
        Array.from({ length: fruits }, (_, i) => (
          <circle key={i} cx={(i % 2 ? 19.5 : 12.5) + (i >> 1) * (i % 2 ? 1.6 : -1.6)} cy={27 - (i % 3)} r={1.5} fill={fruit} stroke="#00000022" strokeWidth={0.4} />
        ))}
      {phase === "mature" &&
        def.kind === "tree" &&
        Array.from({ length: fruits }, (_, i) => <circle key={i} cx={i % 2 ? 19 : 13} cy={top + 3 + i * 1.6} r={1.6} fill={fruit} />)}
    </g>
  );
}

export function Person({ c, walking = false }: { c: Character; walking?: boolean }) {
  return (
    <g>
      <ellipse cx={16} cy={30} rx={6} ry={1.6} fill="#00000026" />
      {/* Chân */}
      <rect x={12.5} y={22} width={3} height={7} rx={1.2} fill={c.pants} transform={walking ? "rotate(8 14 22)" : undefined} />
      <rect x={16.5} y={22} width={3} height={7} rx={1.2} fill={c.pants} transform={walking ? "rotate(-8 18 22)" : undefined} />
      {/* Thân áo */}
      <rect x={10.5} y={14} width={11} height={10} rx={3.5} fill={c.shirt} stroke="#00000022" strokeWidth={0.5} />
      <rect x={8.5} y={15} width={3} height={7} rx={1.5} fill={c.shirt} />
      <rect x={20.5} y={15} width={3} height={7} rx={1.5} fill={c.shirt} />
      <circle cx={10} cy={22.5} r={1.4} fill={c.skin} />
      <circle cx={22} cy={22.5} r={1.4} fill={c.skin} />
      {/* Tóc phía sau */}
      {c.hair === "dai" && <rect x={9.5} y={6} width={13} height={12} rx={5} fill={c.hairColor} />}
      {c.hair === "buoc" && <ellipse cx={23} cy={11} rx={2.5} ry={4} fill={c.hairColor} />}
      {/* Đầu */}
      <circle cx={16} cy={9} r={6} fill={c.skin} />
      <circle cx={13.8} cy={9.6} r={0.8} fill="#1f2937" />
      <circle cx={18.2} cy={9.6} r={0.8} fill="#1f2937" />
      <path d="M14.3 12 Q16 13.4 17.7 12" stroke="#9a3412" strokeWidth={0.7} fill="none" strokeLinecap="round" />
      {/* Tóc phía trước */}
      {c.hair === "xu" ? (
        <g fill={c.hairColor}>
          {[10.5, 13, 15.5, 18, 20.5].map((x, i) => (
            <circle key={i} cx={x + 0.5} cy={4.5 + (i % 2)} r={2.6} />
          ))}
        </g>
      ) : (
        <path d="M10 9 Q10 2.5 16 2.5 Q22 2.5 22 9 Q19 6 16 6.5 Q12.5 6 10 9 Z" fill={c.hairColor} />
      )}
      {c.hair === "bui" && <circle cx={16} cy={2.2} r={2.4} fill={c.hairColor} />}
      {/* Phụ kiện */}
      {c.acc === "kinh" && (
        <g stroke="#111827" strokeWidth={0.6} fill="#ffffff55">
          <circle cx={13.8} cy={9.6} r={1.8} />
          <circle cx={18.2} cy={9.6} r={1.8} />
          <path d="M15.6 9.6 H16.4" />
        </g>
      )}
      {c.acc === "mu" && (
        <g fill="#b91c1c">
          <path d="M9.8 6.5 Q10 1.5 16 1.5 Q22 1.5 22.2 6.5 Z" />
          <rect x={18} y={5.6} width={7} height={1.6} rx={0.8} />
        </g>
      )}
      {c.acc === "no" && (
        <g fill="#ec4899">
          <path d="M19 3.5 L22.5 1.8 L22.5 5.2 Z" />
          <path d="M19 3.5 L15.5 1.8 L15.5 5.2 Z" />
          <circle cx={19} cy={3.5} r={0.9} />
        </g>
      )}
    </g>
  );
}

/** Hình cây/nhân vật đứng riêng (ngoài bản đồ), dùng cho ô chọn hạt, bộ sưu tập, trình tạo nhân vật */
export function ArtBox({ size = 64, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg viewBox="0 -6 32 38" width={size} height={size * (38 / 32)} aria-hidden>
      {children}
    </svg>
  );
}
