import { useState, useEffect } from "react";
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
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({});

  // Khởi tạo watermark từ members khi conversation thay đổi
  useEffect(() => {
    if (!members) return;

    const initialWatermarks: Record<string, string> = {};
    members.forEach((member) => {
      if (member.lastReadMessageId) {
        initialWatermarks[member.userId] = member.lastReadMessageId;
      }
    });
    setReadReceipts(initialWatermarks);
  }, [
    // Dùng conversationId làm dependency để reset khi đổi conversation,
    // tránh phụ thuộc trực tiếp vào object members (reference thay đổi liên tục)
    conversationId,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    members,
  ]);

  return { readReceipts, setReadReceipts };
}
