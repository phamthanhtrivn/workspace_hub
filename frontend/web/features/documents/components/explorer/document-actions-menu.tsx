"use client";

import { useId, useState } from "react";
import {
  ChevronDown,
  FolderInput,
  Star,
  StarOff,
  Trash2,
  RotateCcw,
  Trash,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnchoredMenu } from "@/components/ui/anchored-popup";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import type { DocumentItem } from "../../types/documents.types";
import {
  DocumentBulkAction as Action,
  DOCUMENT_BULK_LABELS as LABEL,
} from "../../types/document-bulk.types";
import { DocumentViewType } from "../../types/documents.enums";
import { getBulkBlockers } from "../../utils/document-bulk";

const icons: Record<Action, LucideIcon> = {
  MOVE: FolderInput,
  STAR: Star,
  UNSTAR: StarOff,
  TRASH: Trash2,
  RESTORE: RotateCcw,
  DELETE: Trash,
};

export function DocumentActionsMenu({
  items,
  activeView,
  projectId,
  hasMore,
  disabled,
  onChoose,
}: {
  items: DocumentItem[];
  activeView: DocumentViewType;
  projectId?: string;
  hasMore: boolean;
  disabled: boolean;
  onChoose: (action: Action) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const actions =
    activeView === DocumentViewType.TRASH
      ? [Action.RESTORE, Action.DELETE]
      : projectId
        ? [Action.MOVE, Action.DELETE]
        : [Action.MOVE, Action.STAR, Action.UNSTAR, Action.TRASH];
  if (
    !projectId &&
    activeView !== DocumentViewType.TRASH &&
    items.some((item) => !!item.projectId)
  )
    actions.push(Action.DELETE);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="h-10"
        disabled={disabled || (!items.length && !hasMore)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((previous) => !previous)}
      >
        Actions
        <ChevronDown aria-hidden="true" />
      </Button>
      {open ? (
        <AnchoredMenu
          id={id}
          onClose={() => setOpen(false)}
          align="end"
          className="z-40 w-52 rounded-panel border border-border bg-card p-1.5 shadow-panel"
          aria-label="Document actions"
        >
          {actions.map((action) => {
            const allowed = items.some(
              (item) => !getBulkBlockers([item], action).length,
            );
            const reason =
              !allowed && !hasMore
                ? getBulkBlockers(items, action)[0]?.reason
                : undefined;
            const Icon = icons[action];

            return (
              <DropdownMenuItem
                key={action}
                disabledReason={reason}
                onClick={() => {
                  if (reason) return;
                  setOpen(false);
                  onChoose(action);
                }}
                className="flex w-full items-center gap-2 rounded-control px-3 py-2 text-sm"
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span>{LABEL[action]}</span>
              </DropdownMenuItem>
            );
          })}
        </AnchoredMenu>
      ) : null}
    </div>
  );
}
