"use client";



import { useRef } from "react";
import { Edit2, Trash2 } from "lucide-react";

import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";


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



  if (!isOpen || !buttonRect || (!canEdit && !canRecall)) return null;





  return typeof document === "undefined" ? null : <AnchoredMenu ref={menuRef} onClose={onClose} anchorRect={buttonRect} side={buttonRect.bottom > window.innerHeight / 2 ? "top" : "bottom"} align="end"  className="z-[100] min-w-40 rounded-lg border border-border bg-card py-1 text-sm text-muted-foreground shadow-panel">
      {canEdit && (
        <DropdownMenuItem closeOnClick={false}
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition hover:bg-accent"
        >
          <Edit2 className="h-4 w-4" />
          <span>Edit message</span>
        </DropdownMenuItem>
      )}
      {canRecall && (
        <DropdownMenuItem closeOnClick={false}
          onClick={() => {
            onRecall();
            onClose();
          }}
          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-destructive-content transition hover:bg-destructive-soft"
        >
          <Trash2 className="h-4 w-4" />
          <span>Recall message</span>
        </DropdownMenuItem>
      )}
    </AnchoredMenu>;
}
