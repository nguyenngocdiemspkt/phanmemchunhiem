"use client";

import { useActionState } from "react";
import { addStudentAction, importStudentsAction, type ImportState } from "./actions";

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
  // BOM để Excel đọc đúng tiếng Việt
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function ImportResult({ state, className }: { state: ImportState; className: string }) {
  if (!state) return null;
  if (state.error) return <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
  return (
    <div className="mt-4 space-y-3">
      {state.errors && state.errors.length > 0 && (
        <ul className="list-inside list-disc rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {state.errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
      {state.created && state.created.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-emerald-900">
              Đã tạo {state.created.length} tài khoản. Mật khẩu chỉ hiển thị một lần: hãy tải danh sách về để phát cho học sinh.
            </p>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() =>
                downloadCsv(`tai-khoan-${className}.csv`, [
                  ["Họ và tên", "Tên đăng nhập", "Mật khẩu tạm"],
                  ...state.created!.map((c) => [c.fullName, c.username, c.password]),
                ])
              }
            >
              Tải danh sách tài khoản
            </button>
          </div>
          <div className="max-h-72 overflow-auto rounded bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  <th>Tên đăng nhập</th>
                  <th>Mật khẩu tạm</th>
                </tr>
              </thead>
              <tbody>
                {state.created.map((c) => (
                  <tr key={c.username}>
                    <td>{c.fullName}</td>
                    <td className="font-mono">{c.username}</td>
                    <td className="font-mono">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function ImportStudentsForm({ classId, className }: { classId: string; className: string }) {
  const [state, action, pending] = useActionState(importStudentsAction.bind(null, classId), null);
  return (
    <div>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium"
          required
        />
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang nhập..." : "Nhập danh sách"}
        </button>
        <a href="/api/mau-excel" className="link text-sm">
          Tải file Excel mẫu
        </a>
      </form>
      <ImportResult state={state} className={className} />
    </div>
  );
}

export function AddStudentForm({ classId, className }: { classId: string; className: string }) {
  const [state, action, pending] = useActionState(addStudentAction.bind(null, classId), null);
  return (
    <div>
      <form action={action} className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Họ và tên *</label>
          <input name="fullName" className="input" required />
        </div>
        <div>
          <label className="label">Mã học sinh</label>
          <input name="studentCode" className="input" />
        </div>
        <div>
          <label className="label">Ngày sinh</label>
          <input name="dateOfBirth" className="input" placeholder="dd/mm/yyyy" />
        </div>
        <div>
          <label className="label">Giới tính</label>
          <select name="gender" className="input" defaultValue="">
            <option value=""></option>
            <option>Nam</option>
            <option>Nữ</option>
          </select>
        </div>
        <div>
          <label className="label">Họ tên phụ huynh</label>
          <input name="parentName" className="input" />
        </div>
        <div>
          <label className="label">SĐT phụ huynh</label>
          <input name="parentPhone" className="input" />
        </div>
        <div>
          <label className="label">Tên đăng nhập (bỏ trống để tự tạo)</label>
          <input name="username" className="input" autoCapitalize="none" />
        </div>
        <div className="flex items-end">
          <button className="btn-primary" disabled={pending}>
            {pending ? "Đang thêm..." : "Thêm học sinh"}
          </button>
        </div>
      </form>
      <ImportResult state={state} className={className} />
    </div>
  );
}
