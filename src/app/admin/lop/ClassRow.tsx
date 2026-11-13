"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { deleteClassAction, updateClassAction } from "./actions";

type Props = {
  id: string;
  name: string;
  schoolYear: string;
  teacherId: string | null;
  /** GVCN hiện tại đã bị khóa tài khoản (không có trong danh sách chọn) */
  inactiveTeacher: string | null;
  studentCount: number;
  canDelete: boolean;
  years: string[];
  teachers: { id: string; fullName: string }[];
};

/**
 * Một dòng lớp: sửa tên, năm học, phân công GVCN.
 * Ô nhập được giữ theo state (không dùng form action của React vì React sẽ đặt lại các ô về giá trị đầu
 * sau khi lưu, làm ô GV chủ nhiệm hiện "Chưa phân công" dù đã lưu).
 */
export function ClassRow(p: Props) {
  const [name, setName] = useState(p.name);
  const [year, setYear] = useState(p.schoolYear);
  const [teacherId, setTeacherId] = useState(p.teacherId ?? "");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = name !== p.name || year !== p.schoolYear || teacherId !== (p.teacherId ?? "");

  function save() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("schoolYear", year);
    fd.set("teacherId", teacherId);
    setMsg(null);
    start(async () => setMsg((await updateClassAction(p.id, fd)) ?? null));
  }

  return (
    <tr>
      <td>
        <input value={name} onChange={(e) => setName(e.target.value)} className="input w-28" aria-label="Tên lớp" required />
      </td>
      <td>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="input w-32" aria-label="Năm học">
          {p.years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </td>
      <td>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="input min-w-44" aria-label={`GV chủ nhiệm lớp ${p.name}`}>
          <option value="">— Chưa phân công —</option>
          {p.inactiveTeacher && p.teacherId && <option value={p.teacherId}>{p.inactiveTeacher} (tài khoản đã khóa)</option>}
          {p.teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.fullName}
            </option>
          ))}
        </select>
        {msg && <div className={`mt-1 text-xs ${msg.error ? "text-red-600" : "text-emerald-700"}`}>{msg.error ?? msg.ok}</div>}
      </td>
      <td>
        <Link href={`/gv/lop/${p.id}/hoc-sinh`} className="link">
          {p.studentCount} HS
        </Link>
      </td>
      <td>
        <div className="flex gap-1">
          <button type="button" onClick={save} disabled={pending || !dirty || !name.trim()} className={dirty ? "btn-primary btn-sm" : "btn-secondary btn-sm"}>
            {pending ? "Đang lưu..." : "Lưu"}
          </button>
          {p.canDelete && (
            <form action={deleteClassAction.bind(null, p.id)}>
              <SubmitButton className="btn-danger btn-sm" pendingText="..." confirm={`Xóa lớp ${p.name}?`}>
                Xóa
              </SubmitButton>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
