import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { AvatarUploader } from "@/components/AvatarUploader";
import { PageHeader } from "@/components/ui";
import { PushToggle } from "@/components/PushToggle";
import { pushPublicKey } from "@/lib/push";

const ROLE_LABEL = { ADMIN: "Quản trị", TEACHER: "Giáo viên", STUDENT: "Học sinh" } as const;

/** Trang tài khoản dùng chung cho mọi vai trò: ảnh đại diện, đổi mật khẩu */
export default async function AccountPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <div className="mx-auto max-w-2xl">
        <PageHeader title="Tài khoản của tôi" />
        <div className="card mb-6 flex items-center gap-4">
          <Avatar user={user} size={72} />
          <div>
            <div className="text-lg font-semibold">{user.fullName}</div>
            <div className="text-sm text-slate-500">
              {ROLE_LABEL[user.role]} · {user.username}
              {user.student ? ` · Lớp ${user.student.classroom.name}` : ""}
            </div>
          </div>
        </div>
        <div className="card mb-6">
          <h2 className="mb-1 font-semibold">Ảnh đại diện</h2>
          <p className="mb-3 text-sm text-slate-500">Ảnh được tự cắt vuông và thu nhỏ trước khi lưu. Thầy cô và các bạn trong lớp nhìn thấy ảnh này.</p>
          <AvatarUploader hasAvatar={!!user.avatarUpdatedAt} />
        </div>
        {user.role === "STUDENT" && (
          <div className="mb-6">
            <PushToggle publicKey={pushPublicKey()} />
          </div>
        )}
        <div className="card">
          <h2 className="mb-1 font-semibold">Mật khẩu</h2>
          <p className="mb-3 text-sm text-slate-500">
            {user.mustChangePassword ? "Bạn đang dùng mật khẩu được cấp, nên đổi sang mật khẩu riêng." : "Đổi mật khẩu đăng nhập của bạn."}
          </p>
          <Link href="/doi-mat-khau" className="btn-secondary">
            Đổi mật khẩu
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
