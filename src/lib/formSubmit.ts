import { startTransition } from "react";

/**
 * Gửi form tới action của useActionState mà KHÔNG để React tự đặt lại form sau khi xong.
 * Dùng cho form sửa dữ liệu có ô chọn (select): React 19 đặt lại form sau action, ô chọn khi đó
 * nhảy về lựa chọn đầu tiên (vd vai trò "Giáo viên", GVCN "Chưa phân công") dù dữ liệu đã lưu đúng,
 * và lưu lỗi thì mất những gì người dùng vừa nhập.
 *
 *   <form onSubmit={submitKeep(action)}>
 */
export function submitKeep(action: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => action(fd));
  };
}
