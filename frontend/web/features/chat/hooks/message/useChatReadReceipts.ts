import { useState } from "react";
import { ConversationMember } from "../../types/chat.types";

/**
 * Quản lý read receipts (watermark đọc tin nhắn) trong chat area.
 *
 * - Khởi tạo từ danh sách members của conversation hiện tại.
 * - Cung cấp `setReadReceipts` để socket handler cập nhật khi nhận event MESSAGE_READ.
 */
export function useChatReadReceipts(
  members: ConversationMember[] | undefined,
  conversationId: string | undefined,
) {
  const [readReceipts, setReadReceipts] = useState(() => initialWatermarks(members));
  const [receiptContext, setReceiptContext] = useState({ conversationId, members });

  // Khởi tạo watermark từ members khi conversation thay đổi
  if (receiptContext.conversationId !== conversationId || receiptContext.members !== members) {
    setReceiptContext({ conversationId, members });
    setReadReceipts(initialWatermarks(members));
  }

  return { readReceipts, setReadReceipts };
}

function initialWatermarks(members: ConversationMember[] | undefined): Record<string, string> {
  return Object.fromEntries((members ?? []).filter(member => member.lastReadMessageId).map(member => [member.userId, member.lastReadMessageId!]));
}
