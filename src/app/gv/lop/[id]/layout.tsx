import { requireClassAccess } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { ClassTabs } from "./ClassTabs";

export default async function ClassLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const { user, classroom } = await requireClassAccess(id);
  return (
    <>
      <PageHeader
        title={`Lớp ${classroom.name}`}
        subtitle={`Năm học ${classroom.schoolYear}`}
        back={user.role === "ADMIN" ? { href: "/admin", label: "Tổng quan trường" } : { href: "/gv", label: "Lớp chủ nhiệm" }}
      />
      <ClassTabs classId={id} />
      {children}
    </>
  );
}
