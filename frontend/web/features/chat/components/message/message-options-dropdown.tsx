import React, { useEffect, useRef } from "react";
import { Edit2, Pin, Trash2 } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

interface MessageOptionsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  buttonRect: DOMRect | null;
  isMe: boolean;
  onEdit?: () => void;
  onPin?: () => void;
  onRecall?: () => void;
  canEdit?: boolean;
  canRecall?: boolean;
  isPinned?: boolean;
}

export const MessageOptionsDropdown: React.FC<MessageOptionsDropdownProps> = ({
  isOpen,
  onClose,
  buttonRect,
  isMe,
  onEdit,
  onPin,
  onRecall,
  canEdit = false,
  canRecall = true,
  isPinned = false,
}) => {
  const intl = useAppIntl();
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

  if (!isOpen || !buttonRect) return null;

  const getStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      left: isMe ? buttonRect.right + 10 : buttonRect.left,
      transform: "none",
    };

    if (buttonRect.bottom > window.innerHeight / 2) {
      // Open upwards
      style.bottom = window.innerHeight - buttonRect.top + 10;
    } else {
      // Open downwards
      style.top = buttonRect.bottom + 10;
    }
    return style;
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-white border border-gray-200 rounded-xl shadow-lg py-1 text-sm text-gray-700 animate-in fade-in zoom-in-95 duration-100"
      style={getStyle()}
    >
      {isMe && canEdit && (
        <button
          onClick={() => {
            onEdit?.();
            onClose();
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Edit2 size={16} />
          <span>{intl.formatMessage({ id: "chat.editMessage" })}</span>
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
        <span>
          {intl.formatMessage({
            id: isPinned ? "chat.unpinMessage" : "chat.pinMessage",
          })}
        </span>
      </button>

      {isMe && canRecall && (
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
            <span>{intl.formatMessage({ id: "chat.recallMessage" })}</span>
          </button>
        </>
      )}
    </div>
  );
};
