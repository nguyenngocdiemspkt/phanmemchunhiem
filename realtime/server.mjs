// Dịch vụ realtime của vườn lớp: ai đang online, vị trí nhân vật, phòng chat chung của lớp,
// và chuyển tín hiệu WebRTC cho trò chuyện giọng nói khi đứng gần (âm thanh đi thẳng giữa các máy, không qua đây, không ghi âm).
// Chạy riêng cạnh app Next.js:  node --env-file=.env realtime/server.mjs
// nginx chuyển wss://<tên-miền>/realtime tới đây. App gọi POST /notify (nội bộ) khi GVCN bật/tắt chat hoặc xóa tin.
import http from "node:http";
import { WebSocketServer } from "ws";
import { jwtVerify } from "jose";
import { PrismaClient } from "@prisma/client";

const PORT = Number(process.env.REALTIME_PORT ?? 3101);
const HOST = process.env.REALTIME_HOST ?? "127.0.0.1";
const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
const CHAT_KEEP_MS = 3 * 24 * 60 * 60 * 1000; // tin chat tự xóa sau 3 ngày
const CHAT_HISTORY = 100;
const CHAT_MAX_LEN = 300;
const CHAT_MIN_INTERVAL_MS = 1500;
const MAX_COORD = 200;

if ((process.env.AUTH_SECRET ?? "").length < 32) {
  console.error("AUTH_SECRET chưa được cấu hình");
  process.exit(1);
}

const prisma = new PrismaClient();

// ---------- Lọc từ ngữ không phù hợp (so khớp không dấu, theo từ) ----------
const BAD_WORDS = [
  "dm",
  "dmm",
  "dcm",
  "du ma",
  "dit",
  "deo",
  "vcl",
  "vkl",
  "vl",
  "cc",
  "lon",
  "buoi",
  "cac",
  "di me",
  "con cho",
  "thang cho",
  "oc cho",
  "ngu nhu cho",
  "fuck",
  "shit",
];
function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}
/** Thay từ không phù hợp bằng *** (giữ nguyên phần còn lại của câu) */
export function filterText(text) {
  const words = text.split(/(\s+)/);
  const plain = words.map((w) => normalize(w).replace(/[^a-z0-9]/g, ""));
  for (const bad of BAD_WORDS) {
    const parts = bad.split(" ");
    for (let i = 0; i < words.length; i += 2) {
      let j = i;
      let k = 0;
      while (k < parts.length && j < words.length && plain[j] === parts[k]) {
        j += 2;
        k++;
      }
      if (k === parts.length) for (let m = i; m < j; m += 2) words[m] = "***";
    }
  }
  return words.join("");
}

// ---------- Phòng của từng lớp ----------
/** classId -> { sockets: Set, positions: Map<studentId,{x,y}>, conns: Map<studentId, number>, voice: Map<studentId, ws>, chatEnabled } */
const rooms = new Map();

async function getRoom(classId) {
  let room = rooms.get(classId);
  if (!room) {
    const cls = await prisma.classroom.findUnique({
      where: { id: classId },
      select: { chatEnabled: true },
    });
    room = {
      sockets: new Set(),
      positions: new Map(),
      conns: new Map(),
      voice: new Map(),
      chatEnabled: cls?.chatEnabled ?? true,
    };
    rooms.set(classId, room);
  }
  return room;
}

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}
function broadcast(room, msg, except) {
  const data = JSON.stringify(msg);
  for (const ws of room.sockets)
    if (ws !== except && ws.readyState === ws.OPEN) ws.send(data);
}

function publicChat(m) {
  return {
    id: m.id,
    studentId: m.studentId,
    name: m.authorName,
    text: m.text,
    at: m.createdAt.toISOString(),
  };
}

async function recentChat(classId) {
  const since = new Date(Date.now() - CHAT_KEEP_MS);
  const list = await prisma.chatMessage.findMany({
    where: { classId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: CHAT_HISTORY,
  });
  return list.reverse().map(publicChat);
}

// ---------- Máy chủ HTTP (sức khỏe + lệnh nội bộ từ app) ----------
const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
  }
  if (req.method === "POST" && req.url === "/notify") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      try {
        const msg = JSON.parse(body || "{}");
        if (msg.secret !== process.env.AUTH_SECRET) {
          res.writeHead(403);
          return res.end();
        }
        const room = rooms.get(msg.classId);
        if (msg.type === "chatState") {
          if (room) {
            room.chatEnabled = !!msg.enabled;
            broadcast(room, { t: "chatState", enabled: room.chatEnabled });
          }
        } else if (msg.type === "chatDeleted" && room) {
          broadcast(room, { t: "chatDeleted", id: msg.id });
        }
        res.writeHead(200);
        res.end("ok");
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
});

// ---------- WebSocket ----------
const wss = new WebSocketServer({ noServer: true, maxPayload: 32768 });

server.on("upgrade", async (req, socket, head) => {
  try {
    const url = new URL(req.url ?? "", "http://x");
    if (!url.pathname.endsWith("/realtime")) throw new Error("path");
    const { payload } = await jwtVerify(
      url.searchParams.get("ve") ?? "",
      SECRET,
    );
    if (
      payload.typ !== "vuon" ||
      typeof payload.cid !== "string" ||
      typeof payload.sub !== "string"
    )
      throw new Error("ve");
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, payload),
    );
  } catch {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
  }
});

wss.on("connection", async (ws, ticket) => {
  const classId = ticket.cid;
  const isStudent = ticket.role === "student";
  const studentId = isStudent ? ticket.sub : null;
  const room = await getRoom(classId);
  room.sockets.add(ws);
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  if (isStudent) {
    // Vị trí ban đầu: lấy từ phòng (nếu em đang mở tab khác) hoặc từ vé (vị trí đã lưu)
    if (!room.positions.has(studentId)) {
      room.positions.set(studentId, {
        x: Number(ticket.x) || 1,
        y: Number(ticket.y) || 1,
      });
    }
    room.conns.set(studentId, (room.conns.get(studentId) ?? 0) + 1);
    if (room.conns.get(studentId) === 1)
      broadcast(
        room,
        { t: "join", id: studentId, ...room.positions.get(studentId) },
        ws,
      );
  }

  send(ws, {
    t: "hello",
    online: [...room.positions].map(([id, p]) => ({ id, x: p.x, y: p.y })),
    chat: await recentChat(classId),
    chatEnabled: room.chatEnabled,
    voice: [...room.voice.keys()],
  });

  let lastChat = 0;
  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    if (!isStudent) return; // giáo viên chỉ xem
    if (msg.t === "move") {
      const x = Math.trunc(Number(msg.x));
      const y = Math.trunc(Number(msg.y));
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        x < 0 ||
        y < 0 ||
        x > MAX_COORD ||
        y > MAX_COORD
      )
        return;
      room.positions.set(studentId, { x, y });
      broadcast(room, { t: "move", id: studentId, x, y }, ws);
    } else if (msg.t === "chat") {
      if (!room.chatEnabled)
        return send(ws, { t: "error", text: "Thầy/cô đang tắt phòng chat." });
      const text = String(msg.text ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, CHAT_MAX_LEN);
      if (!text) return;
      const now = Date.now();
      if (now - lastChat < CHAT_MIN_INTERVAL_MS)
        return send(ws, {
          t: "error",
          text: "Em gửi nhanh quá, đợi một chút nhé.",
        });
      lastChat = now;
      const saved = await prisma.chatMessage.create({
        data: {
          classId,
          studentId,
          authorName: String(ticket.name ?? ""),
          text: filterText(text),
        },
      });
      broadcast(room, { t: "chat", msg: publicChat(saved) });
    } else if (msg.t === "voice") {
      // Bật/tắt chế độ giọng nói (tab bật sau cùng của em là tab nhận tín hiệu)
      if (msg.on) {
        room.voice.set(studentId, ws);
        broadcast(room, { t: "voice", id: studentId, on: true }, ws);
      } else if (room.voice.get(studentId) === ws) {
        room.voice.delete(studentId);
        broadcast(room, { t: "voice", id: studentId, on: false }, ws);
      }
    } else if (msg.t === "rtc") {
      // Chuyển tín hiệu WebRTC (offer/answer/ice) tới bạn trong cùng lớp
      if (room.voice.get(studentId) !== ws) return;
      const target = room.voice.get(String(msg.to ?? ""));
      if (target && target !== ws)
        send(target, { t: "rtc", from: studentId, data: msg.data });
    }
  });

  ws.on("close", async () => {
    room.sockets.delete(ws);
    if (!isStudent) {
      if (room.sockets.size === 0) rooms.delete(classId);
      return;
    }
    if (room.voice.get(studentId) === ws) {
      room.voice.delete(studentId);
      broadcast(room, { t: "voice", id: studentId, on: false });
    }
    const left = (room.conns.get(studentId) ?? 1) - 1;
    if (left > 0) return room.conns.set(studentId, left);
    room.conns.delete(studentId);
    const pos = room.positions.get(studentId);
    room.positions.delete(studentId);
    broadcast(room, { t: "leave", id: studentId });
    // Lưu vị trí cuối để lần sau vào lại đứng đúng chỗ
    if (pos)
      await prisma.student
        .update({
          where: { id: studentId },
          data: { posX: pos.x, posY: pos.y, posAt: new Date() },
        })
        .catch(() => {});
    if (room.sockets.size === 0) rooms.delete(classId);
  });
});

// Ngắt kết nối chết (mất mạng không báo đóng)
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

// Tin chat quá 3 ngày tự xóa
async function cleanupChat() {
  const { count } = await prisma.chatMessage.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - CHAT_KEEP_MS) } },
  });
  if (count) console.log(`Đã xóa ${count} tin chat quá 3 ngày`);
}
setInterval(() => void cleanupChat().catch(console.error), 60 * 60 * 1000);
void cleanupChat().catch(console.error);

server.listen(PORT, HOST, () =>
  console.log(`Realtime vườn lớp chạy tại ${HOST}:${PORT}`),
);
