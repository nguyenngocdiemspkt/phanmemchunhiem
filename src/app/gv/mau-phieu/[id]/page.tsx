import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { parseQuestions } from "@/lib/questions";
import { PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { TemplateEditor } from "../TemplateEditor";
import { deleteTemplateAction, duplicateTemplateAction } from "../actions";

export default async function TemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const t = await prisma.formTemplate.findUnique({ where: { id } });
  const editable = !!t && (user.role === "ADMIN" || t.ownerId === user.id);
  if (!t || !(t.isShared || editable)) notFound();
  const questions = parseQuestions(t.questions);

  return (
    <>
      <PageHeader
        title={t.name}
        back={{ href: "/gv/mau-phieu", label: "Mẫu phiếu" }}
        actions={
          <>
            <form action={duplicateTemplateAction.bind(null, id)}>
              <SubmitButton className="btn-secondary">Nhân bản</SubmitButton>
            </form>
            {editable && (
              <form action={deleteTemplateAction.bind(null, id)}>
                <SubmitButton className="btn-danger" confirm={`Xóa mẫu "${t.name}"? Các đợt đã tạo từ mẫu này vẫn được giữ nguyên.`}>
                  Xóa
                </SubmitButton>
              </form>
            )}
          </>
        }
      />
      {editable ? (
        <TemplateEditor
          templateId={id}
          canShare={user.role === "ADMIN"}
          initial={{ name: t.name, description: t.description ?? "", questions, isShared: t.isShared }}
        />
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl bg-sky-50 p-4 text-sm text-sky-900">
            Đây là mẫu dùng chung của nhà trường. Bấm <b>Nhân bản</b> để tạo bản riêng và chỉnh sửa.
          </p>
          {questions.map((q, i) => (
            <div key={q.id} className="card">
              <div className="font-medium">
                {i + 1}. {q.text}
              </div>
              {q.type === "single" ? (
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {q.options!.map((o) => (
                    <li key={o.id}>
                      ○ {o.label} <span className="text-xs text-slate-400">({o.score} điểm{o.alert ? ", cần quan tâm" : ""})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm italic text-slate-400">Câu tự luận</p>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
