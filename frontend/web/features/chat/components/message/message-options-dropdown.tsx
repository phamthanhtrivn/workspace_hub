
import React, { useRef } from "react";
import { Edit2, Pin, Trash2 } from "lucide-react";

import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";


const VIEWPORT_GAP_PX = 12;

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
  const menuRef = useRef<HTMLDivElement>(null);



  if (!isOpen || !buttonRect) return null;



  return typeof document === "undefined" ? null : <AnchoredMenu ref={menuRef} onClose={onClose} anchorRect={buttonRect} side={buttonRect.bottom > window.innerHeight / 2 ? "top" : "bottom"} align="start" alignOffset={isMe ? buttonRect.width + VIEWPORT_GAP_PX : 0} className="z-50 w-[180px] max-w-[calc(100vw-1.5rem)] overflow-y-auto bg-card border border-border rounded-panel py-1 text-sm text-foreground animate-in fade-in zoom-in-95 duration-100 shadow-panel">
      {isMe && canEdit && (
        <DropdownMenuItem closeOnClick={false}
          onClick={() => {
            onEdit?.();
            onClose();
          }}
          className="w-full text-left px-4 py-2 hover:bg-background flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Edit2 size={16} />
          <span>Edit message</span>
        </DropdownMenuItem>
      )}

      <DropdownMenuItem closeOnClick={false}
        onClick={() => {
          onPin?.();
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-background flex items-center gap-2 cursor-pointer transition-colors"
      >
        <Pin size={16} />
        <span>
          {isPinned ? "Unpin message" : "Pin message"}
        </span>
      </DropdownMenuItem>

      {isMe && canRecall && (
        <>
          <div className="h-px bg-muted my-1 mx-2" />
          <DropdownMenuItem closeOnClick={false}
            onClick={() => {
              onRecall?.();
              onClose();
            }}
            className="w-full text-left px-4 py-2 hover:bg-destructive-soft text-destructive-content flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 size={16} />
            <span>Recall message</span>
          </DropdownMenuItem>
        </>
      )}
    </AnchoredMenu>;
};
