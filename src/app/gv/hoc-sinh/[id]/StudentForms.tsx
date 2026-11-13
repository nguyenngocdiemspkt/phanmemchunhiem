"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitKeep } from "@/lib/formSubmit";
import { FormMessage } from "@/components/ui";
import { addNoteAction, setStudentStatusAction, transferStudentAction, updateProfileAction } from "./actions";

type Profile = {
  fullName: string;
  studentCode: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  parentName: string;
  parentPhone: string;
  note: string;
};

export function ProfileForm({ studentId, profile }: { studentId: string; profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction.bind(null, studentId), null);
  const field = (name: keyof Profile, label: string) => (
    <div>
      <label className="label">{label}</label>
      <input name={name} className="input" defaultValue={profile[name]} />
    </div>
  );
  return (
    <form key={JSON.stringify(profile)} onSubmit={submitKeep(action)} className="grid gap-3 sm:grid-cols-2">
      {field("fullName", "Họ và tên")}
      {field("studentCode", "Mã học sinh")}
      {field("dateOfBirth", "Ngày sinh")}
      <div>
        <label className="label">Giới tính</label>
        <select name="gender" className="input" defaultValue={profile.gender}>
          <option value=""></option>
          <option>Nam</option>
          <option>Nữ</option>
        </select>
      </div>
      {field("parentName", "Họ tên phụ huynh")}
      {field("parentPhone", "SĐT phụ huynh")}
      <div className="sm:col-span-2">{field("address", "Địa chỉ")}</div>
      <div className="sm:col-span-2">{field("note", "Ghi chú (học sinh và phụ huynh không thấy)")}</div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu thông tin"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function AddNoteForm({ studentId, today }: { studentId: string; today: string }) {
  const [state, action, pending] = useActionState(addNoteAction.bind(null, studentId), null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Loại ghi nhận</label>
          <select name="type" className="input">
            <option value="POSITIVE">Hành động tích cực</option>
            <option value="PROGRESS">Chuyển biến / tiến bộ</option>
            <option value="CONCERN">Điều cần quan tâm (chỉ GV thấy)</option>
          </select>
        </div>
        <div>
          <label className="label">Ngày</label>
          <input name="date" type="date" className="input" defaultValue={today} />
        </div>
      </div>
      <textarea name="content" className="input min-h-20" placeholder="vd: Em chủ động giúp bạn Lan ôn bài Toán." required />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visibleToStudent" defaultChecked /> Cho học sinh xem trong hành trình của em
      </label>
      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Thêm ghi nhận"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function StatusForm({ studentId, status }: { studentId: string; status: string }) {
  const [state, action, pending] = useActionState(setStudentStatusAction.bind(null, studentId), null);
  return (
    <form key={status} onSubmit={submitKeep(action)} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
      <select name="status" className="input" defaultValue={status}>
        <option value="ACTIVE">Đang học</option>
        <option value="TRANSFERRED">Chuyển trường</option>
        <option value="LEFT">Nghỉ học</option>
      </select>
      <input name="reason" className="input" placeholder="Lý do (không bắt buộc)" />
      <button
        className="btn-primary"
        disabled={pending}
        onClick={(e) => {
          const v = (e.currentTarget.form?.elements.namedItem("status") as HTMLSelectElement | null)?.value;
          if (v !== "ACTIVE" && !confirm("Tài khoản học sinh sẽ bị khóa. Hồ sơ và các phiếu cũ vẫn được giữ lại. Tiếp tục?")) e.preventDefault();
        }}
      >
        {pending ? "Đang lưu..." : "Cập nhật"}
      </button>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function TransferForm({ studentId, classes }: { studentId: string; classes: { id: string; label: string }[] }) {
  const [state, action, pending] = useActionState(transferStudentAction.bind(null, studentId), null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
      <select name="toClassId" className="input" defaultValue="" required>
        <option value="" disabled>
          — Chọn lớp mới —
        </option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <input name="reason" className="input" placeholder="Lý do chuyển lớp" />
      <button
        className="btn-primary"
        disabled={pending}
        onClick={(e) => {
          if (!confirm("Chuyển học sinh sang lớp mới? Giáo viên lớp cũ sẽ không còn quản lý em này; lịch sử đánh giá được giữ nguyên.")) e.preventDefault();
        }}
      >
        {pending ? "Đang chuyển..." : "Chuyển lớp"}
      </button>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
