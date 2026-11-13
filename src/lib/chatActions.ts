"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { requireClassAccess } from "./auth";
import { audit } from "./audit";
import { notifyRealtime } from "./realtime";

/** GVCN bật/tắt phòng chat của lớp */
export async function toggleChatAction(classId: string) {
  const { user, classroom } = await requireClassAccess(classId);
  const enabled = !classroom.chatEnabled;
  await prisma.classroom.update({ where: { id: classId }, data: { chatEnabled: enabled } });
  await audit(user, "class.chat.toggle", { classId, entity: "Classroom", entityId: classId, summary: `Lớp ${classroom.name}: ${enabled ? "bật" : "tắt"} phòng chat trong vườn` });
  await notifyRealtime({ type: "chatState", classId, enabled });
  revalidatePath(`/gv/lop/${classId}/chat`);
}

/** GVCN xóa tin nhắn không phù hợp (nội dung được ghi vào nhật ký để đối chiếu) */
export async function deleteChatMessageAction(classId: string, messageId: string) {
  const { user, classroom } = await requireClassAccess(classId);
  const msg = await prisma.chatMessage.findFirst({ where: { id: messageId, classId } });
  if (!msg) return;
  await prisma.chatMessage.delete({ where: { id: messageId } });
  await audit(user, "class.chat.delete", {
    classId,
    entity: "ChatMessage",
    entityId: messageId,
    summary: `Lớp ${classroom.name}: xóa tin chat của ${msg.authorName}: "${msg.text.slice(0, 120)}"`,
  });
  await notifyRealtime({ type: "chatDeleted", classId, id: messageId });
  revalidatePath(`/gv/lop/${classId}/chat`);
}
