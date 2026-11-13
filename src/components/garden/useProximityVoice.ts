"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { benchZoneAt, type GardenLayout } from "@/lib/garden";
import type { IceServer } from "./useGardenRealtime";

/** Nghe rõ hoàn toàn trong bán kính này (ô) */
const FULL_RADIUS = 2;
/** Xa hơn bán kính này thì không nghe thấy nữa (ô) */
export const HEAR_RADIUS = 7;
/** Ngắt kết nối khi đi xa hơn (lớn hơn HEAR_RADIUS một chút để không bật/tắt liên tục ở ranh giới) */
const DROP_RADIUS = 9;
const RETRY_AFTER_FAIL_MS = 10000;

type Pos = { x: number; y: number };
type Peer = {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  gain: GainNode | null;
  /** âm lượng cần đặt (tính theo khoảng cách) */
  target: number;
  pending: RTCIceCandidateInit[];
};
type Signal = {
  sdp?: RTCSessionDescriptionInit;
  ice?: RTCIceCandidateInit;
  bye?: true;
};

/** Âm lượng theo khoảng cách; cùng khu ghế đá thì nghe rõ như ngồi cạnh nhau */
export function voiceGain(d: number, sameZone: boolean) {
  if (sameZone || d <= FULL_RADIUS) return 1;
  if (d >= HEAR_RADIUS) return 0;
  return 1 - (d - FULL_RADIUS) / (HEAR_RADIUS - FULL_RADIUS);
}

/**
 * Trò chuyện bằng giọng nói khi đứng gần: mỗi cặp bạn ở gần nhau kết nối WebRTC trực tiếp (âm thanh không đi qua
 * máy chủ, không ghi âm). Máy chủ realtime chỉ chuyển tín hiệu kết nối. Bạn có mã nhỏ hơn là bên gọi trước.
 */
export function useProximityVoice({
  meId,
  pos,
  voiceOn,
  ice,
  connected,
  layout,
  send,
  rtcRef,
}: {
  meId: string | null;
  pos: Record<string, Pos>;
  voiceOn: Set<string>;
  ice: IceServer[];
  connected: boolean;
  layout: GardenLayout;
  send: (msg: unknown) => boolean;
  rtcRef: MutableRefObject<((from: string, data: unknown) => void) | null>;
}) {
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState<Record<string, number>>({}); // bạn đang nghe được -> âm lượng

  const peers = useRef(new Map<string, Peer>());
  /** tăng mỗi khi thêm/bớt kết nối để tính lại danh sách đang nghe */
  const [peerTick, setPeerTick] = useState(0);
  const failedAt = useRef(new Map<string, number>());
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const joinedRef = useRef(false);
  const iceRef = useRef(ice);
  iceRef.current = ice;
  const posRef = useRef(pos);
  posRef.current = pos;

  /** Âm lượng hiện tại của một bạn so với em */
  const gainOf = useCallback(
    (id: string) => {
      const me = meId ? posRef.current[meId] : null;
      const p = posRef.current[id];
      if (!me || !p) return 0;
      const a = benchZoneAt(layout, me.x, me.y);
      const b = benchZoneAt(layout, p.x, p.y);
      return voiceGain(
        Math.hypot(p.x - me.x, p.y - me.y),
        !!a && a.id === b?.id,
      );
    },
    [meId, layout],
  );

  const closePeer = useCallback(
    (id: string, notify: boolean) => {
      const p = peers.current.get(id);
      if (!p) return;
      peers.current.delete(id);
      p.pc.onicecandidate = null;
      p.pc.ontrack = null;
      p.pc.onconnectionstatechange = null;
      p.pc.close();
      p.audio.srcObject = null;
      p.gain?.disconnect();
      if (notify) send({ t: "rtc", to: id, data: { bye: true } });
      setLinked((l) => {
        const n = { ...l };
        delete n[id];
        return n;
      });
    },
    [send],
  );

  const createPeer = useCallback(
    (id: string) => {
      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      const audio = new Audio();
      audio.autoplay = true;
      const peer: Peer = {
        pc,
        audio,
        gain: null,
        target: gainOf(id),
        pending: [],
      };
      peers.current.set(id, peer);
      setPeerTick((t) => t + 1);
      pc.onicecandidate = (e) => {
        if (e.candidate)
          send({ t: "rtc", to: id, data: { ice: e.candidate.toJSON() } });
      };
      pc.ontrack = (e) => {
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        audio.srcObject = stream;
        const ctx = ctxRef.current;
        if (ctx) {
          // Chrome cần phần tử audio đang phát (tắt tiếng) thì WebAudio mới nhận được âm thanh từ WebRTC
          audio.muted = true;
          const gain = ctx.createGain();
          gain.gain.value = peer.target;
          ctx
            .createMediaStreamSource(stream)
            .connect(gain)
            .connect(ctx.destination);
          peer.gain = gain;
        } else audio.volume = peer.target;
        void audio.play().catch(() => {});
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          failedAt.current.set(id, Date.now());
          closePeer(id, false);
        }
      };
      return peer;
    },
    [send, closePeer, gainOf],
  );

  const attachMic = useCallback(async (pc: RTCPeerConnection) => {
    const track = streamRef.current?.getAudioTracks()[0];
    const t = pc.getTransceivers()[0];
    if (!t) return;
    t.direction = "sendrecv";
    if (track) await t.sender.replaceTrack(track);
  }, []);

  /** Gọi một bạn (bên có mã nhỏ hơn) */
  const call = useCallback(
    async (id: string) => {
      const peer = createPeer(id);
      peer.pc.addTransceiver("audio", { direction: "sendrecv" });
      await attachMic(peer.pc);
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      send({
        t: "rtc",
        to: id,
        data: { sdp: peer.pc.localDescription?.toJSON() },
      });
    },
    [createPeer, attachMic, send],
  );

  /** Nhận tín hiệu từ bạn khác */
  const onSignal = useCallback(
    async (from: string, raw: unknown) => {
      if (!joinedRef.current) return;
      const data = raw as Signal;
      try {
        if (data.bye) return closePeer(from, false);
        if (data.sdp?.type === "offer") {
          closePeer(from, false);
          const peer = createPeer(from);
          await peer.pc.setRemoteDescription(data.sdp);
          await attachMic(peer.pc);
          const answer = await peer.pc.createAnswer();
          await peer.pc.setLocalDescription(answer);
          send({
            t: "rtc",
            to: from,
            data: { sdp: peer.pc.localDescription?.toJSON() },
          });
          for (const c of peer.pending.splice(0))
            await peer.pc.addIceCandidate(c);
        } else if (data.sdp?.type === "answer") {
          const peer = peers.current.get(from);
          if (!peer || peer.pc.signalingState !== "have-local-offer") return;
          await peer.pc.setRemoteDescription(data.sdp);
          for (const c of peer.pending.splice(0))
            await peer.pc.addIceCandidate(c);
        } else if (data.ice) {
          const peer = peers.current.get(from);
          if (!peer) return;
          if (peer.pc.remoteDescription)
            await peer.pc.addIceCandidate(data.ice);
          else peer.pending.push(data.ice);
        }
      } catch {
        closePeer(from, false);
      }
    },
    [closePeer, createPeer, attachMic, send],
  );

  useEffect(() => {
    rtcRef.current = (from, data) => void onSignal(from, data);
    return () => {
      rtcRef.current = null;
    };
  }, [rtcRef, onSignal]);

  const leave = useCallback(() => {
    joinedRef.current = false;
    for (const id of [...peers.current.keys()]) closePeer(id, true);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    send({ t: "voice", on: false });
    setJoined(false);
    setMicOn(false);
    setHasMic(false);
    setLinked({});
  }, [closePeer, send]);

  /** Vào trò chuyện giọng nói (phải bấm nút: trình duyệt chỉ cho phát âm thanh/mở micro sau thao tác của người dùng) */
  const join = useCallback(async () => {
    if (!meId) return;
    setError(null);
    if (typeof RTCPeerConnection === "undefined")
      return setError(
        "Trình duyệt này không hỗ trợ trò chuyện bằng giọng nói.",
      );
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctxRef.current = new Ctx();
      await ctxRef.current.resume();
    } catch {
      ctxRef.current = null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      stream.getAudioTracks().forEach((t) => (t.enabled = false)); // mic tắt sẵn
      streamRef.current = stream;
      setHasMic(true);
    } catch {
      setError(
        "Không mở được micro (chưa cho phép hoặc máy không có micro). Em vẫn nghe được các bạn ở gần.",
      );
    }
    joinedRef.current = true;
    setJoined(true);
    setMicOn(false);
    send({ t: "voice", on: true });
  }, [meId, send]);

  const toggleMic = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }, []);

  // Mất kết nối realtime: đóng hết, khi nối lại thì báo lại là em đang bật giọng nói
  useEffect(() => {
    if (!joinedRef.current) return;
    if (connected) send({ t: "voice", on: true });
    else for (const id of [...peers.current.keys()]) closePeer(id, false);
  }, [connected, send, closePeer]);

  // Kết nối với bạn ở gần, ngắt với bạn đi xa, chỉnh âm lượng theo khoảng cách
  useEffect(() => {
    if (!joined || !meId || !connected) return;
    const me = pos[meId];
    if (!me) return;
    const myZone = benchZoneAt(layout, me.x, me.y);
    const next: Record<string, number> = {};
    for (const id of [...peers.current.keys()])
      if (!voiceOn.has(id)) closePeer(id, false);
    for (const id of voiceOn) {
      if (id === meId) continue;
      const p = pos[id];
      if (!p) continue;
      const d = Math.hypot(p.x - me.x, p.y - me.y);
      const zone = benchZoneAt(layout, p.x, p.y);
      const sameZone = !!myZone && zone?.id === myZone.id;
      const g = voiceGain(d, sameZone);
      const peer = peers.current.get(id);
      if (peer) {
        if (d > DROP_RADIUS && !sameZone) {
          closePeer(id, true);
          continue;
        }
        peer.target = g;
        if (peer.gain && ctxRef.current)
          peer.gain.gain.setTargetAtTime(g, ctxRef.current.currentTime, 0.15);
        else peer.audio.volume = g;
        if (g > 0) next[id] = g;
      } else if (
        (d <= HEAR_RADIUS || sameZone) &&
        meId < id &&
        Date.now() - (failedAt.current.get(id) ?? 0) > RETRY_AFTER_FAIL_MS
      ) {
        void call(id).catch(() => closePeer(id, false));
      }
    }
    setLinked((l) => {
      const a = Object.keys(l);
      const b = Object.keys(next);
      return a.length === b.length &&
        b.every((k) => Math.abs((l[k] ?? -1) - next[k]) < 0.05)
        ? l
        : next;
    });
  }, [joined, meId, connected, pos, voiceOn, layout, call, closePeer, peerTick]);

  // Rời trang: dừng micro, đóng kết nối
  useEffect(
    () => () => {
      for (const p of peers.current.values()) p.pc.close();
      peers.current.clear();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      void ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  return { joined, micOn, hasMic, error, linked, join, leave, toggleMic };
}
