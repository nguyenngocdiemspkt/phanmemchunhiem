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

type Palette = { leaf: string; dark: string; stem: string; bloom: string; center: string; fruit: string; trunk: string };

/** Phóng to/thu nhỏ quanh gốc cây (16, 29) */
const grow = (s: number) => `translate(16 29) scale(${s}) translate(-16 -29)`;

/** Mầm và hạt dùng chung cho mọi loài */
function Sprout({ c }: { c: Palette }) {
  return (
    <g>
      <path d="M16 29 V22" stroke={c.stem} strokeWidth={1.5} strokeLinecap="round" />
      <ellipse cx={13.6} cy={21.6} rx={2.8} ry={1.5} fill={c.leaf} transform="rotate(-25 13.6 21.6)" />
      <ellipse cx={18.4} cy={21.6} rx={2.8} ry={1.5} fill={c.leaf} transform="rotate(25 18.4 21.6)" />
    </g>
  );
}

// ----- Hướng dương: thân cao thẳng, lá hình tim, một bông lớn nghiêng -----
function Sunflower({ c, leaves, mature, fruits }: { c: Palette; leaves: number; mature: boolean; fruits: number }) {
  const n = Math.min(leaves, 8);
  const heart = (x: number, y: number, flip: boolean, k: number) => (
    <path
      d={`M${x} ${y} c${flip ? "" : "-"}${3 * k} ${-2 * k} ${flip ? "" : "-"}${6 * k} ${1 * k} ${flip ? "" : "-"}${3 * k} ${4 * k} c${flip ? "-" : ""}${1 * k} ${-1 * k} ${flip ? "-" : ""}${2.5 * k} ${-2.5 * k} ${flip ? "-" : ""}${3 * k} ${-4 * k} Z`}
      fill={c.leaf}
    />
  );
  return (
    <g>
      <path d="M16 29 V3" stroke={c.stem} strokeWidth={1.8} strokeLinecap="round" />
      {Array.from({ length: n }, (_, i) => heart(16, 26 - i * 2.8, i % 2 === 0, 0.9 + (n - i) * 0.03))}
      {mature && (
        <g transform="rotate(-15 16 4)">
          {Array.from({ length: 14 }, (_, i) => (
            <ellipse key={i} cx={16} cy={-1.2} rx={1.5} ry={3.4} fill={c.bloom} transform={`rotate(${i * (360 / 14)} 16 4)`} />
          ))}
          <circle cx={16} cy={4} r={4} fill={c.center} />
          {Array.from({ length: 7 }, (_, i) => (
            <circle key={i} cx={16 + Math.cos(i) * 2.2} cy={4 + Math.sin(i * 1.7) * 2.2} r={0.45} fill="#fde68a" />
          ))}
        </g>
      )}
      {mature &&
        // Thêm trái = các bông con trên nhánh phụ
        Array.from({ length: Math.min(fruits - 1, 4) }, (_, i) => {
          const y = 12 + i * 4;
          const x = i % 2 ? 21 : 11;
          return (
            <g key={i}>
              <path d={`M16 ${y + 2} L${x} ${y}`} stroke={c.stem} strokeWidth={0.9} />
              {Array.from({ length: 8 }, (_, j) => (
                <ellipse key={j} cx={x} cy={y - 1.6} rx={0.7} ry={1.6} fill={c.bloom} transform={`rotate(${j * 45} ${x} ${y})`} />
              ))}
              <circle cx={x} cy={y} r={1.2} fill={c.center} />
            </g>
          );
        })}
    </g>
  );
}

// ----- Hoa hồng: bụi thấp nhiều nhánh có gai, nhiều bông nhỏ nhiều lớp cánh -----
function Rose({ c, leaves, mature, fruits }: { c: Palette; leaves: number; mature: boolean; fruits: number }) {
  const stems = [
    "M16 29 Q11 22 7 16",
    "M16 29 Q14 18 12 11",
    "M16 29 Q17 17 19 10",
    "M16 29 Q22 21 25 15",
    "M16 29 Q16 23 16 18",
  ];
  const tips = [
    [7, 16],
    [12, 11],
    [19, 10],
    [25, 15],
    [16, 18],
    [10, 21],
    [22, 21],
  ];
  const n = Math.min(leaves, 18);
  return (
    <g>
      {stems.map((d, i) => (
        <path key={i} d={d} stroke={c.dark} strokeWidth={1.1} fill="none" />
      ))}
      {/* Gai */}
      {[
        [10.5, 21],
        [13.5, 17],
        [17.5, 15],
        [21.5, 20],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l1 -1.2 l0.3 1.4 Z`} fill={c.dark} />
      ))}
      {/* Lá nhỏ răng cưa mọc quanh bụi */}
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 1.1 + Math.PI * 0.95;
        const r = 6 + (i % 3) * 2.2;
        const x = 16 + Math.cos(a) * r;
        const y = 22 + Math.sin(a) * r * 0.7;
        return <path key={i} d={`M${x} ${y} q1.6 -1.4 3 0 q-1.4 1.4 -3 0 Z`} fill={i % 2 ? c.leaf : c.dark} transform={`rotate(${(i * 47) % 360} ${x + 1.5} ${y})`} />;
      })}
      {mature &&
        tips.slice(0, Math.min(fruits + 2, tips.length)).map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={2.4} fill={c.bloom} />
            <circle cx={x} cy={y} r={1.6} fill={c.center} />
            <path d={`M${x - 1} ${y} q1 -1.2 2 0 q-1 1 -2 0`} fill={c.bloom} />
          </g>
        ))}
    </g>
  );
}

// ----- Hoa sen: chậu nước, lá tròn nổi, búp sen nhọn và gương sen -----
function Lotus({ c, leaves, mature, fruits }: { c: Palette; leaves: number; mature: boolean; fruits: number }) {
  const pads = [
    [10, 27, 4],
    [21, 27.5, 3.6],
    [15, 25.5, 3],
    [25, 26, 2.6],
    [6.5, 25.8, 2.4],
  ];
  return (
    <g>
      <ellipse cx={16} cy={27.5} rx={13} ry={3.6} fill="#7cc4e8" stroke="#3b82f6" strokeWidth={0.7} />
      {pads.slice(0, Math.max(1, Math.min(5, Math.ceil(leaves / 2)))).map(([x, y, r], i) => (
        <path key={i} d={`M${x} ${y} L${x + r} ${y - 0.4} A${r} ${r * 0.45} 0 1 1 ${x + r * 0.9} ${y + 0.9} Z`} fill={i % 2 ? c.leaf : c.dark} />
      ))}
      {mature && (
        <g>
          <path d="M16 26 Q15 18 16 9" stroke={c.stem} strokeWidth={1} fill="none" />
          {/* Búp sen nhọn nhiều cánh */}
          {[-40, -20, 0, 20, 40].map((a, i) => (
            <path key={i} d="M16 9 q-2.4 -4 0 -8 q2.4 4 0 8 Z" fill={i === 2 ? c.bloom : mix(c.bloom, "#ffffff", 0.25)} transform={`rotate(${a} 16 9)`} />
          ))}
          {/* Gương sen trên cuống riêng */}
          {Array.from({ length: Math.min(fruits, 4) }, (_, i) => {
            const x = i % 2 ? 21 + i : 11 - i;
            const y = 15 + i * 2;
            return (
              <g key={i}>
                <path d={`M${x} 26 Q${x} ${y + 4} ${x} ${y}`} stroke={c.stem} strokeWidth={0.8} fill="none" />
                <path d={`M${x - 2} ${y} h4 l-1 2.4 h-2 Z`} fill={c.fruit} />
                {[-1, 0, 1].map((d) => (
                  <circle key={d} cx={x + d} cy={y + 0.5} r={0.35} fill="#365314" />
                ))}
              </g>
            );
          })}
        </g>
      )}
      {!mature && leaves >= 4 && <path d="M16 26 Q15.5 21 16 17 q-1.4 -2.4 0 -4.4 q1.4 2.4 0 4.4" stroke={c.stem} strokeWidth={0.9} fill={c.leaf} />}
    </g>
  );
}

// ----- Cây cam: tán tròn dày, quả tròn cam -----
function Orange({ c, mature, fruits }: { c: Palette; mature: boolean; fruits: number }) {
  const spots = [
    [11, 11],
    [21, 12],
    [16, 16],
    [8, 15],
    [24, 16],
    [14, 7],
    [19, 7],
    [12, 18],
    [20, 18],
    [16, 11],
    [25, 11],
    [7, 10],
  ];
  return (
    <g>
      <path d="M16 29 V18" stroke={c.trunk} strokeWidth={3} strokeLinecap="round" />
      <circle cx={16} cy={12} r={10.5} fill={c.dark} />
      <circle cx={16} cy={11.4} r={9.6} fill={c.leaf} />
      {Array.from({ length: 16 }, (_, i) => (
        <circle key={i} cx={16 + Math.cos(i * 2.4) * (3 + (i % 4) * 1.8)} cy={11.4 + Math.sin(i * 2.4) * (3 + (i % 4) * 1.8)} r={1.2} fill={c.dark} opacity={0.5} />
      ))}
      {mature &&
        spots.slice(0, fruits).map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={2} fill={c.fruit} />
            <circle cx={x - 0.6} cy={y - 0.6} r={0.5} fill="#fed7aa" />
          </g>
        ))}
    </g>
  );
}

// ----- Cây táo: thân chẻ đôi, tán xòe rộng hai bên, quả đỏ có cuống lá -----
function Apple({ c, mature, fruits }: { c: Palette; mature: boolean; fruits: number }) {
  const spots = [
    [7, 15],
    [25, 15],
    [12, 11],
    [20, 11],
    [16, 15],
    [4, 13],
    [28, 13],
    [10, 17],
    [22, 17],
    [16, 9],
    [14, 13],
    [18, 13],
  ];
  return (
    <g>
      <path d="M16 29 Q15 23 16 20 M16 21 Q12 18 9 16 M16 21 Q20 18 23 16" stroke={c.trunk} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <ellipse cx={9} cy={13} rx={8.5} ry={5.5} fill={c.dark} />
      <ellipse cx={23} cy={13} rx={8.5} ry={5.5} fill={c.dark} />
      <ellipse cx={16} cy={11} rx={8} ry={5.5} fill={c.leaf} />
      <ellipse cx={8.5} cy={12.4} rx={6.5} ry={4} fill={c.leaf} />
      <ellipse cx={23.5} cy={12.4} rx={6.5} ry={4} fill={c.leaf} />
      {mature &&
        spots.slice(0, fruits).map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={1.9} fill={c.fruit} />
            <path d={`M${x} ${y - 1.8} v-1`} stroke="#713f12" strokeWidth={0.5} />
            <ellipse cx={x + 0.9} cy={y - 2.6} rx={0.9} ry={0.45} fill="#4d7c0f" />
          </g>
        ))}
    </g>
  );
}

// ----- Cây xoài: thân cao, tán bầu dục đứng, lá dài rủ, quả thuôn treo thành chùm -----
function Mango({ c, mature, fruits }: { c: Palette; mature: boolean; fruits: number }) {
  const hang = [
    [10, 16],
    [22, 16],
    [16, 19],
    [13, 12],
    [19, 12],
    [8, 11],
    [24, 11],
    [16, 8],
    [11, 20],
    [21, 20],
    [14, 16],
    [18, 16],
  ];
  return (
    <g>
      <path d="M16 29 V14" stroke={c.trunk} strokeWidth={2.6} strokeLinecap="round" />
      <ellipse cx={16} cy={9} rx={9} ry={12} fill={c.dark} />
      <ellipse cx={16} cy={8.5} rx={8} ry={11} fill={c.leaf} />
      {/* Lá dài rủ dưới tán */}
      {Array.from({ length: 9 }, (_, i) => {
        const x = 9 + i * 1.75;
        return <path key={i} d={`M${x} ${17 + (i % 2)} q0.6 3 0 5.5`} stroke={c.dark} strokeWidth={1.1} fill="none" strokeLinecap="round" />;
      })}
      {mature &&
        hang.slice(0, fruits).map(([x, y], i) => (
          <g key={i}>
            <path d={`M${x} ${y - 3} V${y - 1.2}`} stroke="#713f12" strokeWidth={0.4} />
            <ellipse cx={x} cy={y + 0.6} rx={1.3} ry={2.4} fill={c.fruit} transform={`rotate(${i % 2 ? 12 : -12} ${x} ${y})`} />
          </g>
        ))}
    </g>
  );
}

/** Cây theo loài và trạng thái (số lá, số trái, mức héo). Gốc ở (16, 29); cây trưởng thành vươn cao hơn ô 32×32. */
export function Plant({ seed, state }: { seed: string; state: PlantState }) {
  const def = SEEDS[seed] ?? SEEDS.sunflower;
  const { phase, fruits, wilt } = state;
  const t = WILT_MIX[wilt] ?? 0;
  const c: Palette = {
    leaf: mix(def.leaf, DRY, t),
    dark: mix(mix(def.leaf, "#000000", 0.25), DRY, t),
    stem: mix("#4d7c0f", DRY, t),
    bloom: mix(def.bloom, DRY, t),
    center: mix(def.center, DRY, t),
    fruit: mix(def.fruit, DRY, t),
    trunk: mix("#78350f", DRY, t / 2),
  };
  if (phase === "seed") {
    return (
      <g>
        <ellipse cx={16} cy={27} rx={7} ry={3} fill="#7c5a3a" />
        <ellipse cx={16} cy={25.6} rx={2.4} ry={1.7} fill="#a16207" />
        <path d="M16 24.2 q0.6 -1.2 1.4 -1.4" stroke="#65a30d" strokeWidth={0.8} fill="none" />
      </g>
    );
  }
  if (phase === "sprout") return <Sprout c={c} />;

  const mature = phase === "mature";
  // Đang lớn: hình của loài thu nhỏ theo số lá; trưởng thành: kích thước đầy đủ
  const s = mature ? 1 : Math.min(0.85, 0.35 + state.leaves * 0.045);
  const droop = wilt ? `rotate(${wilt === 2 ? 22 : 12} 16 29)` : "";
  const props = { c, leaves: state.leaves, mature, fruits };
  const body =
    seed === "rose" ? <Rose {...props} /> :
    seed === "lotus" ? <Lotus {...props} /> :
    seed === "orange" ? <Orange {...props} /> :
    seed === "apple" ? <Apple {...props} /> :
    seed === "mango" ? <Mango {...props} /> :
    <Sunflower {...props} />;
  return <g transform={`${droop} ${grow(s)}`}>{body}</g>;
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
