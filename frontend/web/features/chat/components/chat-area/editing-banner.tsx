"use client";

import { X } from "lucide-react";
import { ChatMessageResponse } from "../../types/chat.types";

interface EditingBannerProps {
  editingMessage: ChatMessageResponse;
  onCancelEdit: () => void;
}

/**
 * Banner displaying above the input bar when a user is editing a message.
 */
export default function EditingBanner({
  editingMessage,
  onCancelEdit,
}: EditingBannerProps) {
  return (
    <div className="bg-warning-soft border-t border-border p-2 px-4 flex items-center justify-between">
      <div className="flex flex-col min-w-0 flex-1 border-l border-warning pl-3">
        <span className="text-xs font-semibold text-warning">
          Edit Message
        </span>
        <span className="text-sm text-muted-foreground truncate">
          {editingMessage.content}
        </span>
      </div>
      <button
        onClick={onCancelEdit}
        aria-label="Cancel"
        className="p-1 text-muted-foreground hover:text-muted-foreground hover:bg-warning-soft rounded-full cursor-pointer ml-2 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
