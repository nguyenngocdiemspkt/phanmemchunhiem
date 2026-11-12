"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nextGoal, plantLabel, plotPos, SEEDS, TILE, type Character, type GardenThresholds, type PlantState } from "@/lib/garden";
import { moveAction } from "@/lib/gardenActions";
import { Person, Plant } from "./Art";

export type MapPlot = {
  id: string;
  name: string;
  character: Character;
  seed: string | null;
  state: PlantState;
  /** Điểm vườn: chỉ có với chính em hoặc khi giáo viên xem */
  score: number | null;
  plot: number;
  x: number;
  y: number;
};

const STEP_MS = 140;
const POLL_MS = 5000;
const SAVE_DELAY_MS = 1200;

/**
 * Bản đồ vườn lớp nhìn từ trên xuống. Học sinh điều khiển nhân vật của mình (phím mũi tên/WASD, chạm, nút);
 * vị trí các bạn được cập nhật vài giây một lần. Giáo viên chỉ xem, bấm vào ô đất để xem cây.
 */
export function GardenMap({
  classId,
  className,
  plots,
  meId,
  size,
  thresholds,
}: {
  classId: string;
  className: string;
  plots: MapPlot[];
  meId: string | null;
  size: { w: number; h: number };
  thresholds: GardenThresholds;
}) {
  const me = plots.find((p) => p.id === meId) ?? null;
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(() => Object.fromEntries(plots.map((p) => [p.id, { x: p.x, y: p.y }])));
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [walking, setWalking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const clamp = useCallback((x: number, y: number) => ({ x: Math.min(size.w - 2, Math.max(1, x)), y: Math.min(size.h - 2, Math.max(1, y)) }), [size]);

  const step = useCallback(
    (dx: number, dy: number) => {
      if (!meId) return;
      setPos((prev) => {
        const cur = prev[meId];
        const next = clamp(cur.x + dx, cur.y + dy);
        if (next.x === cur.x && next.y === cur.y) return prev;
        // Lưu vị trí khi em dừng di chuyển
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void moveAction(next.x, next.y), SAVE_DELAY_MS);
        return { ...prev, [meId]: next };
      });
      setWalking(true);
      setSelected(null);
    },
    [meId, clamp],
  );

  // Bàn phím
  useEffect(() => {
    if (!meId) return;
    const keys: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    let last = 0;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = keys[e.key] ?? keys[e.key.toLowerCase()];
      if (!k) return;
      e.preventDefault();
      setTarget(null);
      const now = Date.now();
      if (now - last < STEP_MS) return;
      last = now;
      step(k[0], k[1]);
    };
    const onUp = () => setWalking(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [meId, step]);

  // Đi tới điểm đã chạm, từng ô một
  useEffect(() => {
    if (!target || !meId) return;
    const timer = setInterval(() => {
      const cur = pos[meId];
      const dx = Math.sign(target.x - cur.x);
      const dy = Math.sign(target.y - cur.y);
      if (!dx && !dy) {
        setTarget(null);
        setWalking(false);
        return;
      }
      // Đi theo trục còn xa hơn trước
      if (Math.abs(target.x - cur.x) >= Math.abs(target.y - cur.y)) step(dx, 0);
      else step(0, dy);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [target, meId, pos, step]);

  // Cập nhật vị trí các bạn
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/vuon/${classId}`, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const list = (await res.json()) as { id: string; x: number; y: number }[];
        setPos((prev) => {
          const next = { ...prev };
          for (const p of list) if (p.id !== meId && next[p.id]) next[p.id] = { x: p.x, y: p.y };
          return next;
        });
      } catch {
        // mất mạng tạm thời: lần sau thử lại
      }
    };
    const timer = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [classId, meId]);

  useEffect(() => () => void (saveTimer.current && clearTimeout(saveTimer.current)), []);

  // Ô đất gần nhân vật của em nhất (trong bán kính ~1.5 ô), hoặc ô giáo viên chọn
  const nearby = useMemo(() => {
    if (selected) return plots.find((p) => p.id === selected) ?? null;
    if (!meId) return null;
    const cur = pos[meId];
    let best: MapPlot | null = null;
    let bestD = 2.3;
    for (const p of plots) {
      const pp = plotPos(p.plot);
      const d = Math.hypot(pp.x + 0.5 - (cur.x + 0.5), pp.y + 0.5 - cur.y);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }, [selected, meId, pos, plots]);

  function onMapClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * size.w);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * size.h);
    const plot = plots.find((p) => {
      const pp = plotPos(p.plot);
      return x === pp.x && (y === pp.y || y === pp.y - 1);
    });
    if (plot && !meId) return setSelected(plot.id);
    if (meId) setTarget(clamp(x, y));
  }

  const W = size.w * TILE;
  const H = size.h * TILE;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-emerald-200 shadow-sm">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-manipulation select-none"
          onClick={onMapClick}
          role="img"
          aria-label={`Vườn lớp ${className}`}
        >
          <defs>
            <pattern id="grass" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
              <rect width={TILE} height={TILE} fill="#86c66b" />
              <path d="M6 10 l2 -4 l2 4 M20 24 l2 -4 l2 4 M24 8 l1.5 -3 l1.5 3" stroke="#6fae55" strokeWidth={1.2} fill="none" />
            </pattern>
            <pattern id="soil" width={8} height={8} patternUnits="userSpaceOnUse">
              <rect width={8} height={8} fill="#8b6340" />
              <circle cx={2} cy={2} r={0.8} fill="#6f4e2f" />
              <circle cx={6} cy={5} r={0.7} fill="#a07650" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grass)" />
          {/* Hàng rào */}
          <rect x={TILE * 0.5} y={TILE * 0.5} width={W - TILE} height={H - TILE} fill="none" stroke="#b07a46" strokeWidth={6} strokeDasharray="14 6" rx={10} />
          {/* Lối đi và biển tên */}
          <rect x={TILE} y={TILE * 1.6} width={W - TILE * 2} height={TILE * 0.9} fill="#e7d3a8" rx={8} />
          <g transform={`translate(${TILE * 1.3} ${TILE * 0.7})`}>
            <rect width={TILE * 5.5} height={TILE * 0.95} rx={6} fill="#7c4a1e" />
            <text x={TILE * 2.75} y={TILE * 0.65} textAnchor="middle" fontSize={15} fontWeight={700} fill="#fef3c7">
              Vườn lớp {className}
            </text>
          </g>
          {/* Ao nhỏ trang trí */}
          <ellipse cx={W - TILE * 3} cy={H - TILE * 1.8} rx={TILE * 1.8} ry={TILE * 0.8} fill="#60a5fa" stroke="#3b82f6" strokeWidth={2} />

          {/* Ô đất và cây */}
          {plots.map((p) => {
            const pp = plotPos(p.plot);
            const isMine = p.id === meId;
            const isNear = nearby?.id === p.id;
            return (
              <g key={p.id} transform={`translate(${pp.x * TILE} ${pp.y * TILE})`}>
                <rect x={-4} y={TILE - 10} width={TILE + 8} height={14} rx={5} fill="url(#soil)" stroke={isMine ? "#f59e0b" : isNear ? "#ffffff" : "#5b3b20"} strokeWidth={isMine || isNear ? 2.5 : 1} />
                {p.seed ? (
                  <g transform={`translate(${-TILE * 0.2} ${-TILE * 0.55}) scale(1.4)`}>
                    <Plant seed={p.seed} state={p.state} />
                  </g>
                ) : (
                  <text x={TILE / 2} y={TILE - 1} textAnchor="middle" fontSize={9} fill="#fef3c7">
                    chưa gieo
                  </text>
                )}
                {/* Tên chủ ô đất */}
                <text x={TILE / 2} y={TILE + 13} textAnchor="middle" fontSize={8.5} fontWeight={isMine ? 700 : 500} fill={isMine ? "#78350f" : "#1f3d17"}>
                  {p.name.trim().split(/s+/).at(-1)}
                </text>
              </g>
            );
          })}

          {/* Nhân vật */}
          {plots.map((p) => {
            const at = pos[p.id];
            const isMe = p.id === meId;
            const short = p.name.trim().split(/\s+/).slice(-2).join(" ");
            return (
              <g key={p.id} style={{ transform: `translate(${at.x * TILE}px, ${(at.y - 0.25) * TILE}px)`, transition: `transform ${isMe ? STEP_MS : 900}ms linear` }}>
                <Person c={p.character} walking={isMe && walking} />
                <g transform={`translate(${TILE / 2} -4)`}>
                  <rect x={-short.length * 3.1 - 4} y={-11} width={short.length * 6.2 + 8} height={13} rx={6} fill={isMe ? "#0f766e" : "#00000088"} />
                  <text textAnchor="middle" y={-1.5} fontSize={9.5} fontWeight={isMe ? 700 : 500} fill="#ffffff">
                    {short}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {meId && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Dùng phím mũi tên / W A S D, hoặc chạm vào bản đồ để đi. Đứng cạnh ô đất để xem cây.</p>
          {/* Nút điều hướng cho điện thoại */}
          <div className="grid grid-cols-3 gap-1 sm:hidden" aria-label="Điều khiển nhân vật">
            <span />
            <button type="button" className="btn-secondary btn-sm" aria-label="Lên" onClick={() => step(0, -1)}>
              ▲
            </button>
            <span />
            <button type="button" className="btn-secondary btn-sm" aria-label="Trái" onClick={() => step(-1, 0)}>
              ◀
            </button>
            <button type="button" className="btn-secondary btn-sm" aria-label="Xuống" onClick={() => step(0, 1)}>
              ▼
            </button>
            <button type="button" className="btn-secondary btn-sm" aria-label="Phải" onClick={() => step(1, 0)}>
              ▶
            </button>
          </div>
        </div>
      )}

      <PlotInfo plot={nearby} mine={!!me && nearby?.id === me.id} thresholds={thresholds} />
    </div>
  );
}

function PlotInfo({ plot, mine, thresholds }: { plot: MapPlot | null; mine: boolean; thresholds: GardenThresholds }) {
  if (!plot) return <div className="card text-sm text-slate-500">Đi tới cạnh một ô đất để xem cây của bạn đó.</div>;
  const seed = plot.seed ? SEEDS[plot.seed] : null;
  const next = plot.score != null ? nextGoal(plot.score, thresholds) : null;
  return (
    <div className="card" data-testid="plot-info">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">
          {mine ? "Cây của em" : `Cây của ${plot.name}`}
          {seed && <span className="ml-2 font-normal text-slate-500">· {seed.name}</span>}
        </div>
        {plot.score != null && <span className="text-sm font-semibold text-teal-800">{plot.score} điểm vườn</span>}
      </div>
      {!seed ? (
        <p className="mt-1 text-sm text-slate-500">Chưa gieo hạt trong chu kỳ này.</p>
      ) : (
        <p className="mt-1 text-sm">
          <span className={`font-medium ${plot.state.wilt ? "text-amber-800" : "text-emerald-700"}`}>{plantLabel(plot.state, seed.fruitName)}</span>
          {next && (
            <span className="text-slate-500">
              {" "}
              · còn {next.need} điểm nữa để {next.goal}
            </span>
          )}
          {plot.state.wilt > 0 && mine && <span className="text-slate-500"> · cố gắng tuần tới và làm việc tốt để cây tươi lại nhé!</span>}
        </p>
      )}
    </div>
  );
}
