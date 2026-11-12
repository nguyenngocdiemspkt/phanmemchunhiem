"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import { removeAvatarAction, saveAvatarAction } from "@/lib/avatarActions";
import { FormMessage } from "./ui";

const SIZE = 256;

/** Cắt vuông giữa ảnh và thu nhỏ còn 256×256 ngay trên trình duyệt, trước khi gửi lên */
async function shrink(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function AvatarUploader({ hasAvatar }: { hasAvatar: boolean }) {
  const [state, action, pending] = useActionState(saveAvatarAction, null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Ảnh xem trước" width={64} height={64} className="rounded-full ring-1 ring-slate-200" />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
          onChange={async (e) => {
            setError(null);
            const file = e.target.files?.[0];
            if (!file) return setPreview(null);
            if (!file.type.startsWith("image/")) return setError("Vui lòng chọn một tệp ảnh.");
            try {
              setPreview(await shrink(file));
            } catch {
              setError("Không đọc được ảnh này, vui lòng chọn ảnh khác.");
            }
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          disabled={!preview || pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("image", preview!);
            startTransition(() => action(fd));
            setPreview(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          {pending ? "Đang lưu..." : "Lưu ảnh đại diện"}
        </button>
        {hasAvatar && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (confirm("Xóa ảnh đại diện?")) startTransition(() => removeAvatarAction());
            }}
          >
            Xóa ảnh
          </button>
        )}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <FormMessage state={state} />
    </div>
  );
}
