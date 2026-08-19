"use client";

import { X } from "lucide-react";
import { ChatMessageResponse } from "../../types/chat.types";

interface EditingBannerProps {
  editingMessage: ChatMessageResponse;
  onCancelEdit: () => void;
}

/**
 * Banner hiển thị trên thanh input khi người dùng đang chỉnh sửa tin nhắn.
 * Hiện thị nội dung tin nhắn đang sửa và nút hủy.
 */
export default function EditingBanner({
  editingMessage,
  onCancelEdit,
}: EditingBannerProps) {
  return (
    <div className="bg-orange-50 border-t border-orange-100 p-2 px-4 flex items-center justify-between">
      <div className="flex flex-col min-w-0 flex-1 border-l-4 border-orange-500 pl-3">
        <span className="text-xs font-semibold text-orange-600">
          Edit message
        </span>
        <span className="text-sm text-gray-600 truncate">
          {editingMessage.content}
        </span>
      </div>
      <button
        onClick={onCancelEdit}
        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-orange-100 rounded-full cursor-pointer ml-2 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
