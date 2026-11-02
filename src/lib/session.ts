// Dùng được cả ở middleware (edge) lẫn server: không import Prisma ở đây.
import { SignJWT, jwtVerify } from "jose";

export type Role = "ADMIN" | "TEACHER" | "STUDENT";
export type SessionPayload = { uid: string; role: Role };

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 ngày

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET chưa được cấu hình (cần ít nhất 32 ký tự).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.uid !== "string" || typeof payload.role !== "string") return null;
    return { uid: payload.uid, role: payload.role as Role };
  } catch {
    return null;
  }
}

export function homePath(role: Role) {
  return role === "ADMIN" ? "/admin" : role === "TEACHER" ? "/gv" : "/hs";
}
