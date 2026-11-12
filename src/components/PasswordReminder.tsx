"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "nhac-doi-mat-khau-de-sau";

/** Nhắc đổi mật khẩu khi đang dùng mật khẩu được cấp; "Để sau" ẩn tới khi đóng trình duyệt. */
export function PasswordReminder() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => setHidden(sessionStorage.getItem(KEY) === "1"), []);
  if (hidden) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-2 text-sm text-amber-900">
        <span>Bạn đang dùng mật khẩu được cấp. Nên đổi sang mật khẩu riêng để giữ an toàn tài khoản.</span>
        <span className="ml-auto flex gap-2">
          <Link href="/doi-mat-khau" className="btn-primary btn-sm">
            Đổi mật khẩu
          </Link>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              sessionStorage.setItem(KEY, "1");
              setHidden(true);
            }}
          >
            Để sau
          </button>
        </span>
      </div>
    </div>
  );
}
