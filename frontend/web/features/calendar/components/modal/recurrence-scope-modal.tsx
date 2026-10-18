"use client";

import { createPortal } from "react-dom";

import { Repeat2, X } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { RecurrenceScope } from "../../types/calendar.types";

const SCOPE_LABELS: Record<RecurrenceScope, string> = {
  [RecurrenceScope.THIS]: "This event",
  [RecurrenceScope.THIS_AND_FOLLOWING]: "This and following events",
  [RecurrenceScope.ALL]: "All events in series",
};

export function RecurrenceScopeModal({
  open,
  onClose,
  onSelect,
  title = "Move recurring event",
  allowSingleOccurrence = true,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (scope: RecurrenceScope) => void;
  title?: string;
  allowSingleOccurrence?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef, onClose });
  if (!open) return null;

  return typeof document === "undefined" ? null : createPortal((
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-overlay/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-recurrence-scope-title"
        className="max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-md overflow-y-auto rounded-panel bg-card"
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-info-soft text-info">
            <Repeat2 className="h-4 w-4" />
          </span>
          <h2
            id="calendar-recurrence-scope-title"
            className="min-w-0 flex-1 text-section-title font-semibold text-foreground"
          >
            {title}
          </h2>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1 p-3">
          {Object.values(RecurrenceScope)
            .filter(
              (scope) =>
                allowSingleOccurrence || scope !== RecurrenceScope.THIS,
            )
            .map((scope, index) => (
              <Button
                key={scope}
                data-modal-initial-focus={index === 0 || undefined}
                type="button"
                variant="ghost"
                onClick={() => onSelect(scope)}
                className="h-auto w-full cursor-pointer justify-start rounded-control px-4 py-3 text-left text-sm font-medium text-foreground transition hover:bg-info-soft hover:text-info"
              >
                {SCOPE_LABELS[scope]}
              </Button>
            ))}
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="cursor-pointer rounded-control px-4 py-2 text-sm font-semibold text-info hover:bg-info-soft"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  ), document.body);
}
