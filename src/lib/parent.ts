import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { prisma } from "./db";

function newToken() {
  return randomBytes(18).toString("base64url");
}

/** Mã link phụ huynh cho các học sinh, tạo mới cho em nào chưa có. */
export async function ensureParentTokens(students: { id: string; parentToken: string | null }[]) {
  const map = new Map<string, string>();
  for (const s of students) {
    let token = s.parentToken;
    if (!token) {
      token = newToken();
      await prisma.student.update({ where: { id: s.id }, data: { parentToken: token } });
    }
    map.set(s.id, token);
  }
  return map;
}

/** Đổi mã: link cũ đã gửi phụ huynh sẽ hết hiệu lực. */
export async function regenerateParentToken(studentId: string) {
  await prisma.student.update({ where: { id: studentId }, data: { parentToken: newToken() } });
}

/** Địa chỉ gốc của trang web theo tên miền giáo viên đang dùng (vd: https://abc.vercel.app). */
export async function siteUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function parentLink(base: string, token: string) {
  return `${base}/ph/${token}`;
}

/** Cắt ngắn theo ranh giới từ */
function excerpt(text: string, max: number) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[,.;:\s]+$/, "")}...`;
}

/** Tin nhắn ngắn gửi phụ huynh: tóm tắt kết quả + link xem đầy đủ. */
export function buildParentMessage(p: {
  className: string;
  studentName: string;
  surveyTitle: string;
  score: number | null;
  /** Điểm thi đua tuần và xếp loại (đợt có chấm điểm theo tiêu chí) */
  points?: { value: number; rating: string } | null;
  feedback: string;
  teacherName?: string | null;
  link: string;
}) {
  return [
    `[Lớp ${p.className}] Kính gửi phụ huynh em ${p.studentName}.`,
    `Phiếu tự đánh giá "${p.surveyTitle}"${p.score != null ? `: em tự đánh giá ${p.score}%` : ""}.`,
    p.points ? `Điểm thi đua tuần: ${p.points.value} (${p.points.rating}).` : "",
    p.feedback.trim() ? `Nhận xét của GVCN: ${excerpt(p.feedback, 140)}` : "",
    `Xem chi tiết: ${p.link}`,
    p.teacherName ? `GVCN ${p.teacherName}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Số điện thoại cho đường dẫn sms: (bỏ khoảng trắng, dấu chấm...) */
export function smsPhone(phone: string | null | undefined) {
  const p = (phone ?? "").replace(/[^\d+]/g, "");
  return p.length >= 9 ? p : null;
}
