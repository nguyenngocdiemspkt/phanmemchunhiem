import { prisma } from "@/lib/db";
import { requireStudent } from "@/lib/auth";
import { parseCharacter } from "@/lib/garden";
import { PageHeader } from "@/components/ui";
import { CharacterCreator } from "@/components/garden/CharacterCreator";

export default async function CharacterPage() {
  const { student } = await requireStudent();
  const s = await prisma.student.findUniqueOrThrow({ where: { id: student.id }, select: { character: true } });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Nhân vật của em" back={{ href: "/hs/vuon", label: "Vườn lớp" }} />
      <div className="card">
        <CharacterCreator initial={parseCharacter(s.character, student.id)} firstTime={s.character == null} />
      </div>
    </div>
  );
}
