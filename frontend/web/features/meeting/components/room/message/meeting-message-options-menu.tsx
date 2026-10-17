"use client";

import { useEffect, useRef } from "react";
import { Edit2, Trash2 } from "lucide-react";

interface MeetingMessageOptionsMenuProps {
  isOpen: boolean;
  buttonRect: DOMRect | null;
  onClose: () => void;
  onEdit: () => void;
  onRecall: () => void;
  canEdit: boolean;
  canRecall: boolean;
}

export function MeetingMessageOptionsMenu({
  isOpen,
  buttonRect,
  onClose,
  onEdit,
  onRecall,
  canEdit,
  canRecall,
}: MeetingMessageOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen || !buttonRect || (!canEdit && !canRecall)) return null;

  const style: React.CSSProperties = {
    right: Math.max(12, window.innerWidth - buttonRect.right),
  };

  if (buttonRect.bottom > window.innerHeight / 2) {
    style.bottom = window.innerHeight - buttonRect.top + 8;
  } else {
    style.top = buttonRect.bottom + 8;
  }

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-[100] min-w-40 rounded-lg border border-border bg-card py-1 text-sm text-muted-foreground shadow-panel"
    >
      {canEdit && (
        <button
          type="button"
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-accent"
        >
          <Edit2 className="h-4 w-4" />
          <span>Edit message</span>
        </button>
      )}
      {canRecall && (
        <button
          type="button"
          onClick={() => {
            onRecall();
            onClose();
          }}
          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-destructive transition hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span>Recall message</span>
        </button>
      )}
    </div>
  );
}
