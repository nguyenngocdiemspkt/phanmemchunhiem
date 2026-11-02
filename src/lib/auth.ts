import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "./db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type Role } from "./session";

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { student: { include: { classroom: true } } },
  });
  if (!user || !user.active) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Bắt buộc đăng nhập (và đúng vai trò). Luôn kiểm tra lại trong DB, không chỉ tin cookie. */
export async function requireUser(roles?: Role[], opts?: { allowMustChange?: boolean }) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (user.mustChangePassword && !opts?.allowMustChange) redirect("/doi-mat-khau");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

export async function requireStudent() {
  const user = await requireUser(["STUDENT"]);
  if (!user.student) redirect("/dang-nhap");
  return { user, student: user.student };
}

/** Giáo viên chỉ truy cập được lớp mình chủ nhiệm; quản trị truy cập mọi lớp. */
export async function requireClassAccess(classId: string) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const classroom = await prisma.classroom.findUnique({ where: { id: classId } });
  if (!classroom) notFound();
  if (user.role === "TEACHER" && classroom.homeroomTeacherId !== user.id) notFound();
  return { user, classroom };
}

export async function requireStudentAccess(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true, classroom: true },
  });
  if (!student) notFound();
  const { user } = await requireClassAccess(student.classId);
  return { user, student };
}

export async function createSession(user: { id: string; role: Role }) {
  const token = await signSession({ uid: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export function hashPassword(password: string, rounds = 10) {
  return bcrypt.hash(password, rounds);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Mật khẩu tạm 6 chữ số, học sinh/giáo viên phải đổi ở lần đăng nhập đầu. */
export function randomPassword() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
