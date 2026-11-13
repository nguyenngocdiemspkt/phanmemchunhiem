"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  benchZoneAt,
  findPath,
  nextGoal,
  plantLabel,
  plotPos,
  SEEDS,
  TILE,
  type Character,
  type GardenLayout,
  type GardenThresholds,
  type PlantState,
} from "@/lib/garden";
import { moveAction } from "@/lib/gardenActions";
import { Person, Plant } from "./Art";
import { ChatPanel } from "./ChatPanel";
import { useGardenRealtime } from "./useGardenRealtime";
import { HEAR_RADIUS, useProximityVoice } from "./useProximityVoice";

export type MapPlot = {
  id: string;
  name: string;
  character: Character;
  seed: string | null;
  state: PlantState;
  score: number;
  fromSheets: number;
  fromDeeds: number;
  deeds: { title: string; points: number; helped: boolean }[];
  plot: number;
  x: number;
  y: number;
};

const STEP_MS = 140;
const SAVE_DELAY_MS = 1200;

function signed(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

/** Cây cổ thụ: thân to, rễ nổi, tán nhiều tầng */
function OldTree({ x, y }: { x: number; y: number }) {
  const cx = (x + 1) * TILE;
  const base = (y + 1) * TILE - 4;
  return (
    <g>
      <ellipse
        cx={cx}
        cy={base + 2}
        rx={TILE * 1.4}
        ry={TILE * 0.35}
        fill="#00000022"
      />
      <path
        d={`M${cx - 12} ${base} q4 -6 6 -34 h12 q2 28 6 34 q-6 -4 -12 -2 q-6 -2 -12 2 Z`}
        fill="#6b3f1d"
        stroke="#4a2a12"
        strokeWidth={1.5}
      />
      <path
        d={`M${cx - 3} ${base - 22} q-1 8 1 16`}
        stroke="#4a2a12"
        strokeWidth={1.2}
        fill="none"
      />
      {[
        [-26, -50, 26],
        [24, -48, 26],
        [0, -66, 30],
        [-10, -40, 22],
        [14, -38, 22],
      ].map(([dx, dy, r], i) => (
        <circle
          key={i}
          cx={cx + dx}
          cy={base + dy}
          r={r}
          fill={i % 2 ? "#2f6b2a" : "#3a7d33"}
          stroke="#24531f"
          strokeWidth={1}
        />
      ))}
      {[
        [-14, -58],
        [10, -70],
        [22, -52],
        [-24, -44],
      ].map(([dx, dy], i) => (
        <circle
          key={i}
          cx={cx + dx}
          cy={base + dy}
          r={5}
          fill="#4f9a44"
          opacity={0.7}
        />
      ))}
    </g>
  );
}

/** Ghế đá */
function Bench({ x, y, w }: { x: number; y: number; w: number }) {
  return (
    <g>
      <rect
        x={x * TILE + 4}
        y={y * TILE + 10}
        width={w * TILE - 8}
        height={12}
        rx={4}
        fill="#b8b3a8"
        stroke="#8a857a"
        strokeWidth={1.5}
      />
      <rect
        x={x * TILE + 10}
        y={y * TILE + 21}
        width={6}
        height={8}
        fill="#8a857a"
      />
      <rect
        x={(x + w) * TILE - 16}
        y={y * TILE + 21}
        width={6}
        height={8}
        fill="#8a857a"
      />
    </g>
  );
}

/**
 * Bản đồ vườn lớp nhìn từ trên xuống. Học sinh điều khiển nhân vật của mình (phím mũi tên/WASD, chạm, nút);
 * không đi xuyên ô đất, cây cổ thụ, ghế đá, ao. Giáo viên chỉ xem, bấm vào ô đất để xem cây.
 * Chỉ hiện nhân vật của bạn đang online (kết nối realtime); bạn không online chỉ còn cây và tên trên luống đất.
 */
export function GardenMap({
  classId,
  className,
  plots,
  meId,
  layout,
  thresholds,
}: {
  classId: string;
  className: string;
  plots: MapPlot[];
  meId: string | null;
  layout: GardenLayout;
  thresholds: GardenThresholds;
}) {
  const me = plots.find((p) => p.id === meId) ?? null;
  const blocked = useMemo(() => new Set(layout.blocked), [layout]);
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>(() =>
    Object.fromEntries(plots.map((p) => [p.id, { x: p.x, y: p.y }])),
  );
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [walking, setWalking] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const posRef = useRef(pos);
  posRef.current = pos;
  const rtcRef = useRef<((from: string, data: unknown) => void) | null>(null);

  const rt = useGardenRealtime({
    classId,
    student: !!meId,
    myPos: () => (meId ? (posRef.current[meId] ?? null) : null),
    onPositions: (list) =>
      setPos((prev) => {
        const next = { ...prev };
        for (const p of list)
          if (p.id !== meId && next[p.id]) next[p.id] = { x: p.x, y: p.y };
        return next;
      }),
    onRtc: (from, data) => rtcRef.current?.(from, data),
  });
  const voice = useProximityVoice({
    meId,
    pos,
    voiceOn: rt.voiceOn,
    ice: rt.ice,
    connected: rt.connected,
    layout,
    send: rt.send,
    rtcRef,
  });
  const { sendMove } = rt;

  const free = useCallback(
    (x: number, y: number) =>
      x >= 1 &&
      y >= 1 &&
      x <= layout.w - 2 &&
      y <= layout.h - 2 &&
      !blocked.has(`${x},${y}`),
    [layout, blocked],
  );

  /** Đi tới ô (x, y) nếu ô đó trống; lưu vị trí khi em dừng lại */
  const moveTo = useCallback(
    (x: number, y: number) => {
      if (!meId || !free(x, y)) return false;
      setPos((prev) => ({ ...prev, [meId]: { x, y } }));
      // Báo ngay cho cả lớp qua realtime; khi em dừng lại thì lưu vị trí (để lần sau vào đứng đúng chỗ)
      sendMove(x, y);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void moveAction(x, y), SAVE_DELAY_MS);
      setWalking(true);
      setSelected(null);
      return true;
    },
    [meId, free, sendMove],
  );

  const step = useCallback(
    (dx: number, dy: number) => {
      if (!meId) return;
      const cur = pos[meId];
      moveTo(cur.x + dx, cur.y + dy);
    },
    [meId, pos, moveTo],
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
      setPath([]);
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

  // Đi theo đường đã tìm khi chạm vào bản đồ
  useEffect(() => {
    if (path.length === 0) return;
    const timer = setTimeout(() => {
      const [next, ...rest] = path;
      if (!moveTo(next.x, next.y)) return setPath([]);
      setPath(rest);
      if (rest.length === 0) setWalking(false);
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [path, moveTo]);

  useEffect(
    () => () => void (saveTimer.current && clearTimeout(saveTimer.current)),
    [],
  );

  // Ô đất gần nhân vật của em nhất, hoặc ô giáo viên chọn
  const nearby = useMemo(() => {
    if (selected) return plots.find((p) => p.id === selected) ?? null;
    if (!meId) return null;
    const cur = pos[meId];
    let best: MapPlot | null = null;
    let bestD = 2.3;
    for (const p of plots) {
      const pp = plotPos(p.plot);
      const d = Math.hypot(pp.x - cur.x, pp.y - cur.y);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    return best;
  }, [selected, meId, pos, plots]);

  const myZone = meId ? benchZoneAt(layout, pos[meId].x, pos[meId].y) : null;

  function onMapClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * layout.w);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * layout.h);
    const plot = plots.find((p) => {
      const pp = plotPos(p.plot);
      return x === pp.x && (y === pp.y || y === pp.y - 1);
    });
    if (plot && !meId) return setSelected(plot.id);
    if (!meId) return;
    // Bấm vào ô đất: đi tới ô ngay dưới ô đất đó
    const target = plot ? { x, y: plotPos(plot.plot).y + 1 } : { x, y };
    setPath(findPath(pos[meId], target, layout, blocked));
  }

  const W = layout.w * TILE;
  const H = layout.h * TILE;

  const visible = plots.filter((p) => p.id === meId || rt.online.has(p.id));
  const onlineCount = plots.filter((p) => rt.online.has(p.id)).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-slate-600" data-testid="online-count">
            <span
              className={rt.connected ? "text-emerald-600" : "text-slate-400"}
            >
              ●
            </span>{" "}
            {onlineCount} bạn đang trong vườn
          </span>
          {meId && (
            <div
              className="flex flex-wrap items-center gap-2"
              data-testid="voice-bar"
            >
              {!voice.joined ? (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => void voice.join()}
                  disabled={!rt.connected}
                >
                  🎧 Vào trò chuyện giọng nói
                </button>
              ) : (
                <>
                  {voice.hasMic && (
                    <button
                      type="button"
                      className={
                        voice.micOn
                          ? "btn-primary btn-sm"
                          : "btn-secondary btn-sm"
                      }
                      onClick={voice.toggleMic}
                      aria-pressed={voice.micOn}
                    >
                      {voice.micOn ? "🎙️ Đang bật mic" : "🔇 Mic đang tắt"}
                    </button>
                  )}
                  <span className="text-xs text-slate-500">
                    {Object.keys(voice.linked).length > 0
                      ? `Đang nghe: ${Object.keys(voice.linked)
                          .map((id) =>
                            plots
                              .find((p) => p.id === id)
                              ?.name.trim()
                              .split(/\s+/)
                              .at(-1),
                          )
                          .join(", ")}`
                      : "Chưa có bạn nào ở gần"}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={voice.leave}
                  >
                    Rời
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        {voice.error && <p className="text-xs text-amber-700">{voice.error}</p>}
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
              <pattern
                id="grass"
                width={TILE}
                height={TILE}
                patternUnits="userSpaceOnUse"
              >
                <rect width={TILE} height={TILE} fill="#86c66b" />
                <path
                  d="M6 10 l2 -4 l2 4 M20 24 l2 -4 l2 4 M24 8 l1.5 -3 l1.5 3"
                  stroke="#6fae55"
                  strokeWidth={1.2}
                  fill="none"
                />
              </pattern>
              <pattern
                id="soil"
                width={8}
                height={8}
                patternUnits="userSpaceOnUse"
              >
                <rect width={8} height={8} fill="#8b6340" />
                <circle cx={2} cy={2} r={0.8} fill="#6f4e2f" />
                <circle cx={6} cy={5} r={0.7} fill="#a07650" />
              </pattern>
              <pattern
                id="paving"
                width={16}
                height={16}
                patternUnits="userSpaceOnUse"
              >
                <rect width={16} height={16} fill="#d6d0c4" />
                <path
                  d="M0 8 H16 M8 0 V8 M0 16 M4 8 V16 M12 8 V16"
                  stroke="#bdb6a8"
                  strokeWidth={1}
                />
              </pattern>
            </defs>
            <rect width={W} height={H} fill="url(#grass)" />
            {/* Hàng rào */}
            <rect
              x={TILE * 0.5}
              y={TILE * 0.5}
              width={W - TILE}
              height={H - TILE}
              fill="none"
              stroke="#b07a46"
              strokeWidth={6}
              strokeDasharray="14 6"
              rx={10}
            />
            {/* Lối đi và biển tên */}
            <rect
              x={TILE}
              y={TILE * 1.6}
              width={W - TILE * 2}
              height={TILE * 0.9}
              fill="#e7d3a8"
              rx={8}
            />
            <g transform={`translate(${TILE * 1.3} ${TILE * 0.7})`}>
              <rect
                width={TILE * 5.5}
                height={TILE * 0.95}
                rx={6}
                fill="#7c4a1e"
              />
              <text
                x={TILE * 2.75}
                y={TILE * 0.65}
                textAnchor="middle"
                fontSize={15}
                fontWeight={700}
                fill="#fef3c7"
              >
                Vườn lớp {className}
              </text>
            </g>
            {/* Khu ghế đá */}
            {layout.benchZones.map((b, i) => (
              <g key={b.id}>
                <rect
                  x={b.zone.x * TILE}
                  y={b.zone.y * TILE}
                  width={b.zone.w * TILE}
                  height={b.zone.h * TILE}
                  rx={14}
                  fill="url(#paving)"
                  stroke="#bdb6a8"
                  strokeWidth={2}
                />
                <text
                  x={(b.zone.x + b.zone.w / 2) * TILE}
                  y={(b.zone.y + b.zone.h / 2) * TILE + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#78716c"
                >
                  Ghế đá {i + 1}
                </text>
                {b.benches.map((bench, j) => (
                  <Bench key={j} x={bench.x} y={bench.y} w={bench.w} />
                ))}
              </g>
            ))}
            {/* Ao */}
            <ellipse
              cx={(layout.pond.x + layout.pond.w / 2) * TILE}
              cy={(layout.pond.y + layout.pond.h / 2) * TILE}
              rx={(layout.pond.w / 2) * TILE}
              ry={(layout.pond.h / 2) * TILE}
              fill="#60a5fa"
              stroke="#3b82f6"
              strokeWidth={2}
            />

            {/* Ô đất và cây */}
            {plots.map((p) => {
              const pp = plotPos(p.plot);
              const isMine = p.id === meId;
              const isNear = nearby?.id === p.id;
              return (
                <g
                  key={p.id}
                  transform={`translate(${pp.x * TILE} ${pp.y * TILE})`}
                >
                  <rect
                    x={-4}
                    y={TILE - 10}
                    width={TILE + 8}
                    height={14}
                    rx={5}
                    fill="url(#soil)"
                    stroke={isMine ? "#f59e0b" : isNear ? "#ffffff" : "#5b3b20"}
                    strokeWidth={isMine || isNear ? 2.5 : 1}
                  />
                  {p.seed ? (
                    <g
                      transform={`translate(${-TILE * 0.2} ${-TILE * 0.55}) scale(1.4)`}
                    >
                      <Plant seed={p.seed} state={p.state} />
                    </g>
                  ) : (
                    <text
                      x={TILE / 2}
                      y={TILE - 13}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#1f3d17"
                      opacity={0.7}
                    >
                      chưa gieo
                    </text>
                  )}
                  {/* Tên chủ ô đất, viết trên luống đất để không chồng với tên nhân vật */}
                  <text
                    x={TILE / 2}
                    y={TILE + 0.5}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight={isMine ? 700 : 600}
                    fill={isMine ? "#fde68a" : "#fef3c7"}
                  >
                    {p.name.trim().split(/\s+/).at(-1)}
                  </text>
                </g>
              );
            })}

            {/* Nhân vật */}
            {/* Vùng nghe thấy giọng nói quanh em */}
            {meId && voice.joined && pos[meId] && (
              <circle
                cx={(pos[meId].x + 0.5) * TILE}
                cy={(pos[meId].y + 0.5) * TILE}
                r={HEAR_RADIUS * TILE}
                fill="#ffffff10"
                stroke="#ffffff55"
                strokeDasharray="6 6"
                pointerEvents="none"
              />
            )}
            {visible.map((p) => {
              const at = pos[p.id];
              const isMe = p.id === meId;
              const talking = p.id in voice.linked;
              const short =
                p.name.trim().split(/\s+/).slice(-2).join(" ") +
                (rt.voiceOn.has(p.id) || (isMe && voice.joined)
                  ? talking
                    ? " 🔊"
                    : " 🎧"
                  : "");
              return (
                <g
                  key={p.id}
                  style={{
                    transform: `translate(${at.x * TILE}px, ${(at.y - 0.25) * TILE}px)`,
                    transition: `transform ${isMe ? STEP_MS : 900}ms linear`,
                  }}
                >
                  {talking && (
                    <circle
                      cx={TILE / 2}
                      cy={TILE * 0.6}
                      r={TILE * 0.62}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth={2.5}
                    />
                  )}
                  <Person c={p.character} walking={isMe && walking} />
                  <g transform={`translate(${TILE / 2} -4)`}>
                    <rect
                      x={-short.length * 3.1 - 4}
                      y={-11}
                      width={short.length * 6.2 + 8}
                      height={13}
                      rx={6}
                      fill={isMe ? "#0f766e" : "#00000088"}
                    />
                    <text
                      textAnchor="middle"
                      y={-1.5}
                      fontSize={9.5}
                      fontWeight={isMe ? 700 : 500}
                      fill="#ffffff"
                    >
                      {short}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Cây cổ thụ vẽ sau cùng để tán che lên nhân vật đi phía sau */}
            {layout.oldTrees.map((t, i) => (
              <OldTree key={i} x={t.x} y={t.y} />
            ))}
          </svg>
        </div>

        {meId && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Dùng phím mũi tên / W A S D, hoặc chạm vào bản đồ để đi. Đứng cạnh
              ô đất để xem cây; đứng gần bạn để nói chuyện (cùng khu ghế đá thì
              nghe rõ cả nhóm).
              {myZone && (
                <span className="ml-1 font-medium text-stone-600">
                  Em đang ở khu ghế đá.
                </span>
              )}
            </p>
            {/* Nút điều hướng cho điện thoại */}
            <div
              className="grid grid-cols-3 gap-1 sm:hidden"
              aria-label="Điều khiển nhân vật"
            >
              <span />
              <button
                type="button"
                className="btn-secondary btn-sm"
                aria-label="Lên"
                onClick={() => step(0, -1)}
              >
                ▲
              </button>
              <span />
              <button
                type="button"
                className="btn-secondary btn-sm"
                aria-label="Trái"
                onClick={() => step(-1, 0)}
              >
                ◀
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                aria-label="Xuống"
                onClick={() => step(0, 1)}
              >
                ▼
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm"
                aria-label="Phải"
                onClick={() => step(1, 0)}
              >
                ▶
              </button>
            </div>
          </div>
        )}

        <PlotInfo
          plot={nearby}
          mine={!!me && nearby?.id === me.id}
          thresholds={thresholds}
          start={thresholds.gardenStart}
        />
      </div>
      <ChatPanel
        messages={rt.chat}
        meId={meId}
        canSend={!!meId}
        enabled={rt.chatEnabled}
        connected={rt.connected}
        notice={rt.notice}
        onSend={rt.sendChat}
      />
    </div>
  );
}

function PlotInfo({
  plot,
  mine,
  thresholds,
  start,
}: {
  plot: MapPlot | null;
  mine: boolean;
  thresholds: GardenThresholds;
  start: number;
}) {
  if (!plot)
    return (
      <div className="card text-sm text-slate-500">
        Đi tới cạnh một ô đất để xem cây và điểm của bạn đó.
      </div>
    );
  const seed = plot.seed ? SEEDS[plot.seed] : null;
  const next = nextGoal(plot.score, thresholds);
  return (
    <div className="card" data-testid="plot-info">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">
          {mine ? "Cây của em" : `Cây của ${plot.name}`}
          {seed && (
            <span className="ml-2 font-normal text-slate-500">
              · {seed.name}
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-teal-800">
          {plot.score} điểm vườn
        </span>
      </div>
      {!seed ? (
        <p className="mt-1 text-sm text-slate-500">
          Chưa gieo hạt trong chu kỳ này.
        </p>
      ) : (
        <p className="mt-1 text-sm">
          <span
            className={`font-medium ${plot.state.wilt ? "text-amber-800" : "text-emerald-700"}`}
          >
            {plantLabel(plot.state, seed.fruitName)}
          </span>
          <span className="text-slate-500">
            {" "}
            · còn {next.need} điểm nữa để {next.goal}
          </span>
          {plot.state.wilt > 0 && mine && (
            <span className="text-slate-500">
              {" "}
              · cố gắng tuần tới và làm việc tốt để cây tươi lại nhé!
            </span>
          )}
        </p>
      )}
      <div className="mt-2 grid gap-1 text-xs text-slate-600 sm:grid-cols-3">
        <span>Khởi đầu: {start}</span>
        <span>Phiếu tuần đã duyệt: {signed(plot.fromSheets)}</span>
        <span>Việc tốt: {signed(plot.fromDeeds)}</span>
      </div>
      {plot.deeds.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-emerald-800">
          {plot.deeds.map((d, i) => (
            <li key={i}>
              ★ {d.helped ? `Được bạn giúp: ${d.title}` : d.title} (
              {signed(d.points)})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
