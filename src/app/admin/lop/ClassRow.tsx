"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteClassAction, updateClassAction } from "./actions";

type Props = {
  id: string;
  name: string;
  schoolYear: string;
  teacherId: string | null;
  /** GVCN hiện tại đã bị khóa tài khoản (không có trong danh sách chọn) */
  inactiveTeacher: string | null;
  studentCount: number;
  surveyCount: number;
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

  /** Xóa lớp: lớp có học sinh phải gõ lại đúng tên lớp */
  function remove() {
    let typed = p.name;
    if (p.studentCount > 0 || p.surveyCount > 0) {
      const v = window.prompt(
        `XÓA HẲN LỚP ${p.name}?

` +
          `Sẽ xóa vĩnh viễn ${p.studentCount} học sinh của lớp (tài khoản, hồ sơ, phiếu, điểm, cây trong vườn, việc tốt...) ` +
          `và mọi dữ liệu của lớp (${p.surveyCount} đợt tự đánh giá, thi đua, bình chọn, chat). Không khôi phục được từ giao diện.
` +
          `Học sinh nghỉ/chuyển trường nên đổi trạng thái thay vì xóa.

` +
          `Gõ đúng tên lớp "${p.name}" để xác nhận:`,
      );
      if (v === null) return;
      typed = v;
    } else if (!window.confirm(`Xóa lớp ${p.name}? Lớp đang trống.`)) {
      return;
    }
    setMsg(null);
    start(async () => {
      const r = await deleteClassAction(p.id, typed);
      if (r.error) setMsg(r);
    });
  }

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
          <button type="button" onClick={remove} disabled={pending} className="btn-danger btn-sm">
            Xóa
          </button>
        </div>
      </td>
    </tr>
  );
}
