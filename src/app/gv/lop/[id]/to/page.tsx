import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { removeLastGroupAction, removeMemberAction, renameGroupAction, toggleLeaderAction } from "@/lib/groupActions";
import { classLockedMessage } from "@/lib/schoolYear";
import { groupName } from "@/lib/scoring";
import { byVietnameseName } from "@/lib/students";
import { GROUP_COLORS } from "@/lib/emulation";
import { Badge, Empty } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { AddGroupForm, AddMembersForm } from "./GroupForms";

export default async function GroupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { classroom } = await requireClassAccess(id);
  const locked = await classLockedMessage(classroom);
  const students = await prisma.student.findMany({
    where: { classId: id, status: "ACTIVE" },
    select: { id: true, groupNo: true, isGroupLeader: true, studentCode: true, user: { select: { fullName: true } } },
  });
  students.sort(byVietnameseName((s) => s.user.fullName));
  const groups = Array.from({ length: classroom.groupCount }, (_, i) => i + 1);
  const unassigned = students.filter((s) => !s.groupNo || s.groupNo > classroom.groupCount);
  const name = (n: number) => groupName(classroom.groupNames, n);

  return (
    <div className="space-y-6">
      {locked && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{locked}</p>}

      <div className="card flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold">Các tổ của lớp {classroom.name}</h2>
          <p className="text-sm text-slate-500">
            {classroom.groupCount} tổ · {students.length - unassigned.length}/{students.length} học sinh đã có tổ. Mỗi tổ chọn một tổ trưởng:
            tổ trưởng được nhận xét và đề xuất bổ sung vi phạm cho tổ viên (thầy/cô xác nhận mới tính điểm).
          </p>
        </div>
        {!locked && <AddGroupForm classId={id} nextNo={classroom.groupCount + 1} />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => {
          const members = students.filter((s) => s.groupNo === g);
          const candidates = students
            .filter((s) => s.groupNo !== g)
            .map((s) => ({ id: s.id, name: s.user.fullName, from: s.groupNo && s.groupNo <= classroom.groupCount ? name(s.groupNo) : null }))
            // Học sinh chưa có tổ lên đầu
            .sort((a, b) => Number(!!a.from) - Number(!!b.from));
          return (
            <div key={g} className="card" style={{ borderTop: `4px solid ${GROUP_COLORS[(g - 1) % GROUP_COLORS.length]}` }}>
              {locked ? (
                <h3 className="font-semibold">{name(g)}</h3>
              ) : (
                <form action={renameGroupAction.bind(null, id, g)} className="flex gap-2">
                  <input name="name" defaultValue={name(g)} aria-label={`Tên tổ ${g}`} className="input font-semibold" maxLength={60} />
                  <SubmitButton className="btn-secondary btn-sm" pendingText="...">
                    Đổi tên
                  </SubmitButton>
                </form>
              )}
              <p className="mt-1 text-xs text-slate-500">
                Tổ số {g} · {members.length} học sinh
              </p>
              {members.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Chưa có thành viên.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {members.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        {m.user.fullName}{" "}
                        {m.isGroupLeader && <Badge className="bg-violet-50 text-violet-800 ring-violet-200">Tổ trưởng</Badge>}
                      </span>
                      {!locked && (
                        <span className="flex gap-1">
                          <form action={toggleLeaderAction.bind(null, id, m.id)}>
                            <SubmitButton className="btn-secondary btn-sm" pendingText="...">
                              {m.isGroupLeader ? "Bỏ tổ trưởng" : "Làm tổ trưởng"}
                            </SubmitButton>
                          </form>
                          <form action={removeMemberAction.bind(null, id, m.id)}>
                            <SubmitButton className="btn-danger btn-sm" pendingText="..." confirm={`Đưa ${m.user.fullName} ra khỏi ${name(g)}?`}>
                              Đưa ra
                            </SubmitButton>
                          </form>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!locked && <AddMembersForm classId={id} groupNo={g} candidates={candidates} />}
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Chưa phân tổ ({unassigned.length})</h2>
        {unassigned.length === 0 ? (
          <Empty>Tất cả học sinh đã có tổ.</Empty>
        ) : (
          <p className="text-sm text-slate-700">{unassigned.map((s) => s.user.fullName).join(", ")}</p>
        )}
      </div>

      {!locked && classroom.groupCount > 1 && (
        <form action={removeLastGroupAction.bind(null, id)} className="text-right">
          <SubmitButton
            className="btn-danger"
            confirm={`Xóa ${name(classroom.groupCount)}? Các thành viên sẽ chuyển về "Chưa phân tổ". Điểm thi đua đã ghi cho tổ này vẫn được giữ trong lịch sử.`}
          >
            Xóa {name(classroom.groupCount)} (tổ cuối)
          </SubmitButton>
          <p className="mt-1 text-xs text-slate-500">Chỉ xóa được tổ cuối cùng để số thứ tự và điểm thi đua của các tổ khác không bị thay đổi.</p>
        </form>
      )}
    </div>
  );
}
