import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, homePath, verifySession, type Role } from "./lib/session";

// Lớp chặn sớm theo vai trò. Mỗi trang vẫn tự kiểm tra lại quyền với DB.
const AREA_ROLES: [string, Role[]][] = [
  ["/admin", ["ADMIN"]],
  ["/gv", ["TEACHER", "ADMIN"]],
  ["/hs", ["STUDENT"]],
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const area = AREA_ROLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"));
  if (!area) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.redirect(new URL("/dang-nhap", req.url));
  if (!area[1].includes(session.role)) return NextResponse.redirect(new URL(homePath(session.role), req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/gv/:path*", "/hs/:path*"],
};
