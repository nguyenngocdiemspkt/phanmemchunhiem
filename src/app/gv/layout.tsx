import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  return <AppShell user={user}>{children}</AppShell>;
}
