import { prisma } from "@/lib/db";
import { requireClassAccess } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { deleteChatMessageAction, toggleChatAction } from "@/lib/chatActions";
import { Badge, Empty } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

const KEEP_DAYS = 3;

/** GVCN quản lý phòng chat của lớp trong vườn: bật/tắt, xóa tin không phù hợp. Tin tự xóa sau 3 ngày. */
export default async function ClassChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { classroom } = await requireClassAccess(id);
  const messages = await prisma.chatMessage.findMany({
    where: { classId: id, createdAt: { gte: new Date(Date.now() - KEEP_DAYS * 86400e3) } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="space-y-6">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">
            Phòng chat của lớp{" "}
            {classroom.chatEnabled ? (
              <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-200">Đang bật</Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-600 ring-slate-200">Đang tắt</Badge>
            )}
          </h2>
          <p className="text-sm text-slate-500">
            Học sinh chat chung trong vườn lớp, ai cũng thấy. Tin nhắn được lưu và tự xóa sau {KEEP_DAYS} ngày; thầy/cô xóa được tin không phù hợp.
          </p>
        </div>
        <form action={toggleChatAction.bind(null, id)}>
          <SubmitButton className={classroom.chatEnabled ? "btn-danger" : "btn-primary"} pendingText="...">
            {classroom.chatEnabled ? "Tắt phòng chat" : "Bật phòng chat"}
          </SubmitButton>
        </form>
      </div>

      {messages.length === 0 ? (
        <Empty>Chưa có tin nhắn nào trong {KEEP_DAYS} ngày qua.</Empty>
      ) : (
        <div className="card overflow-x-auto p-0 sm:p-0">
          <table className="table">
            <thead>
              <tr>
                <th className="w-40">Thời gian</th>
                <th className="w-44">Học sinh</th>
                <th>Tin nhắn</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(m.createdAt)}</td>
                  <td className="text-sm">{m.authorName}</td>
                  <td className="text-sm">{m.text}</td>
                  <td>
                    <form action={deleteChatMessageAction.bind(null, id, m.id)}>
                      <SubmitButton className="btn-danger btn-sm" pendingText="..." confirm="Xóa tin nhắn này?">
                        Xóa
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
