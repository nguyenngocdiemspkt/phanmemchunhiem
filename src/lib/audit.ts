import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

type Actor = { id: string; fullName: string } | null;

/**
 * Ghi một dòng nhật ký thao tác. Lỗi ghi nhật ký không được làm hỏng thao tác chính,
 * nên chỉ báo ra log máy chủ.
 */
export async function audit(
  actor: Actor,
  action: string,
  opts: { summary: string; entity?: string; entityId?: string; classId?: string | null; detail?: Prisma.InputJsonValue },
) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id,
        actorName: actor?.fullName,
        action,
        summary: opts.summary.slice(0, 500),
        entity: opts.entity,
        entityId: opts.entityId,
        classId: opts.classId ?? undefined,
        detail: opts.detail,
      },
    });
  } catch (e) {
    console.error("Không ghi được nhật ký thao tác", action, e);
  }
}

/** Nhóm thao tác để lọc trên trang nhật ký */
export const AUDIT_GROUPS: Record<string, string> = {
  auth: "Đăng nhập & mật khẩu",
  teacher: "Giáo viên",
  year: "Năm học",
  class: "Lớp học",
  student: "Học sinh",
  feature: "Đề xuất phần mềm",
};
