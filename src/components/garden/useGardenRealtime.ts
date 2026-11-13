"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ChatMsg = {
  id: string;
  studentId: string | null;
  name: string;
  text: string;
  at: string;
};

type Handlers = {
  /** Vị trí của một hoặc nhiều bạn thay đổi */
  onPositions: (list: { id: string; x: number; y: number }[]) => void;
  /** Tín hiệu WebRTC từ một bạn (giọng nói) */
  onRtc?: (from: string, data: unknown) => void;
};

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

/**
 * Kết nối WebSocket tới dịch vụ realtime của vườn lớp: ai đang online, vị trí, phòng chat.
 * Học sinh nhận vé của lớp mình; giáo viên (classId + observer) chỉ xem. Mất kết nối thì tự nối lại.
 */
export function useGardenRealtime(
  opts: {
    classId: string;
    student: boolean;
    myPos: () => { x: number; y: number } | null;
  } & Handlers,
) {
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState<Set<string>>(new Set());
  const [ice, setIce] = useState<IceServer[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    let stopped = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      if (stopped) return;
      try {
        const o = optsRef.current;
        const pos = o.myPos();
        const q = o.student
          ? pos
            ? `?x=${pos.x}&y=${pos.y}`
            : ""
          : `?lop=${encodeURIComponent(o.classId)}`;
        const res = await fetch(`/api/vuon/ve${q}`, { cache: "no-store" });
        if (!res.ok) throw new Error("ve");
        const {
          url,
          ve,
          ice: iceServers,
        } = (await res.json()) as {
          url: string;
          ve: string;
          ice?: IceServer[];
        };
        if (iceServers) setIce(iceServers);
        const base = url.startsWith("/")
          ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}${url}`
          : url;
        const ws = new WebSocket(`${base}?ve=${encodeURIComponent(ve)}`);
        wsRef.current = ws;
        ws.onopen = () => {
          retry = 0;
          setConnected(true);
        };
        ws.onmessage = (ev) => {
          const m = JSON.parse(String(ev.data));
          const h = optsRef.current;
          if (m.t === "hello") {
            setOnline(new Set(m.online.map((p: { id: string }) => p.id)));
            h.onPositions(m.online);
            setChat(m.chat);
            setChatEnabled(m.chatEnabled);
            setVoiceOn(new Set(m.voice ?? []));
          } else if (m.t === "voice") {
            setVoiceOn((s) => {
              const n = new Set(s);
              if (m.on) n.add(m.id);
              else n.delete(m.id);
              return n;
            });
          } else if (m.t === "rtc") {
            h.onRtc?.(m.from, m.data);
          } else if (m.t === "join") {
            setOnline((s) => new Set(s).add(m.id));
            h.onPositions([{ id: m.id, x: m.x, y: m.y }]);
          } else if (m.t === "leave") {
            const drop = (s: Set<string>) => {
              const n = new Set(s);
              n.delete(m.id);
              return n;
            };
            setOnline(drop);
            setVoiceOn(drop);
          } else if (m.t === "move") {
            h.onPositions([{ id: m.id, x: m.x, y: m.y }]);
          } else if (m.t === "chat") {
            setChat((c) => [...c.slice(-199), m.msg]);
          } else if (m.t === "chatDeleted") {
            setChat((c) => c.filter((x) => x.id !== m.id));
          } else if (m.t === "chatState") {
            setChatEnabled(m.enabled);
          } else if (m.t === "error") {
            setNotice(m.text);
            setTimeout(() => setNotice(null), 3000);
          }
        };
        ws.onclose = () => {
          setConnected(false);
          setOnline(new Set());
          setVoiceOn(new Set());
          wsRef.current = null;
          if (!stopped)
            timer = setTimeout(connect, Math.min(10000, 1000 * 2 ** retry++));
        };
      } catch {
        if (!stopped)
          timer = setTimeout(connect, Math.min(10000, 1000 * 2 ** retry++));
      }
    }
    void connect();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, [opts.classId, opts.student]);

  const sendMove = useCallback((x: number, y: number) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ t: "move", x, y }));
    return true;
  }, []);

  const sendChat = useCallback((text: string) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify({ t: "chat", text }));
    return true;
  }, []);

  /** Gửi một thông điệp bất kỳ (voice / rtc) */
  const send = useCallback((msg: unknown) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }, []);

  return {
    connected,
    online,
    chat,
    chatEnabled,
    notice,
    sendMove,
    sendChat,
    send,
    voiceOn,
    ice,
  };
}
