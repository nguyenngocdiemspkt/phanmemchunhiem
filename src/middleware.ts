import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, homePath, verifySession, type Role } from "./lib/session";

// Lớp chặn sớm theo vai trò. Mỗi trang vẫn tự kiểm tra lại quyền với DB.
const AREA_ROLES: [string, Role[]][] = [
  ["/admin", ["ADMIN"]],
  ["/gv", ["TEACHER", "ADMIN"]],
  ["/hs", ["STUDENT"]],
];

/**
 * Địa chỉ chuyển hướng theo tên miền thật. Khi chạy sau nginx, req.url mang host nội bộ (vd localhost:3100),
 * nên ưu tiên X-Forwarded-Host / X-Forwarded-Proto do proxy gửi tới.
 */
function redirectTo(req: NextRequest, path: string) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return NextResponse.redirect(new URL(path, host ? `${proto}://${host}` : req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const area = AREA_ROLES.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"));
  if (!area) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return redirectTo(req, "/dang-nhap");
  if (!area[1].includes(session.role)) return redirectTo(req, homePath(session.role));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/gv/:path*", "/hs/:path*"],
};
