import React, { useEffect, useRef } from "react";
import { MessageSquare, Edit2, Pin, Trash2, Eye } from "lucide-react";

interface MessageOptionsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position: { top: number; left: number };
  isMe: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onPin?: () => void;
  onRecall?: () => void;
  onViewReadReceipts?: () => void;
}

export const MessageOptionsDropdown: React.FC<MessageOptionsDropdownProps> = ({
  isOpen,
  onClose,
  position,
  isMe,
  onReply,
  onEdit,
  onPin,
  onRecall,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm text-gray-700 animate-in fade-in zoom-in-95 duration-100"
      style={{
        top: position.top,
        left: position.left,
        transform: isMe ? "translate(-100%, 10px)" : "translate(0, 10px)",
      }}
    >
      <button
        onClick={() => {
          onReply?.();
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
      >
        <MessageSquare size={16} />
        <span>Phản hồi</span>
      </button>

      {isMe && (
        <button
          onClick={() => {
            onEdit?.();
            onClose();
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Edit2 size={16} />
          <span>Chỉnh sửa</span>
        </button>
      )}

      <button
        onClick={() => {
          onPin?.();
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
      >
        <Pin size={16} />
        <span>Ghim tin nhắn</span>
      </button>

      {isMe && (
        <>
          <div className="h-px bg-gray-100 my-1 mx-2" />
          <button
            onClick={() => {
              onRecall?.();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 size={16} />
            <span>Thu hồi</span>
          </button>
        </>
      )}
    </div>
  );
};
