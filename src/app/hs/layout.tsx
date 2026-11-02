import { AppShell } from "@/components/AppShell";
import { requireStudent } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireStudent();
  return <AppShell user={user}>{children}</AppShell>;
}
