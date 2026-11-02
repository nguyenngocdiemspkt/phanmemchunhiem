import { requireUser } from "@/lib/auth";
import { DEFAULT_QUESTIONS } from "@/lib/questions";
import { PageHeader } from "@/components/ui";
import { TemplateEditor } from "../TemplateEditor";

export default async function NewTemplatePage() {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  return (
    <>
      <PageHeader title="Tạo mẫu phiếu mới" back={{ href: "/gv/mau-phieu", label: "Mẫu phiếu" }} />
      <TemplateEditor
        templateId={null}
        canShare={user.role === "ADMIN"}
        initial={{ name: "", description: "", questions: DEFAULT_QUESTIONS, isShared: false }}
      />
    </>
  );
}
