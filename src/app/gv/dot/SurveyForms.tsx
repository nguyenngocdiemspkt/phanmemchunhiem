"use client";

import { useActionState } from "react";
import { FormMessage } from "@/components/ui";
import { createSurveyAction, updateSurveyAction } from "./actions";

export function CreateSurveyForm({
  classes,
  currentClassId,
  templates,
  defaults,
}: {
  classes: { id: string; name: string }[];
  currentClassId: string;
  templates: { id: string; name: string }[];
  defaults: { title: string; openAt: string; closeAt: string };
}) {
  const [state, action, pending] = useActionState(createSurveyAction, null);
  if (templates.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Chưa có mẫu phiếu nào.{" "}
        <a href="/gv/mau-phieu/moi" className="link">
          Tạo mẫu phiếu
        </a>
      </p>
    );
  }
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Tên đợt *</label>
        <input name="title" className="input" defaultValue={defaults.title} required />
      </div>
      <div>
        <label className="label">Mẫu phiếu *</label>
        <select name="templateId" className="input" required>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="label">Áp dụng cho lớp</span>
        <div className="flex flex-wrap gap-3 pt-1.5">
          {classes.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name="classIds" value={c.id} defaultChecked={c.id === currentClassId} />
              {c.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label">Mở phiếu lúc *</label>
        <input name="openAt" type="datetime-local" className="input" defaultValue={defaults.openAt} required />
      </div>
      <div>
        <label className="label">Đóng phiếu lúc *</label>
        <input name="closeAt" type="datetime-local" className="input" defaultValue={defaults.closeAt} required />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang tạo..." : "Tạo đợt"}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function EditSurveyForm({
  surveyId,
  defaults,
}: {
  surveyId: string;
  defaults: { title: string; openAt: string; closeAt: string };
}) {
  const [state, action, pending] = useActionState(updateSurveyAction.bind(null, surveyId), null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <div className="sm:col-span-3">
        <label className="label">Tên đợt</label>
        <input name="title" className="input" defaultValue={defaults.title} required />
      </div>
      <div>
        <label className="label">Mở phiếu lúc</label>
        <input name="openAt" type="datetime-local" className="input" defaultValue={defaults.openAt} required />
      </div>
      <div>
        <label className="label">Đóng phiếu lúc</label>
        <input name="closeAt" type="datetime-local" className="input" defaultValue={defaults.closeAt} required />
      </div>
      <div className="flex items-end gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu thời gian"}
        </button>
      </div>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
