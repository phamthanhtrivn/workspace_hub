"use client";

import { Repeat2, X } from "lucide-react";
import { useRef } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { RecurrenceScope } from "../../types/calendar.types";

export function RecurrenceScopeModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (scope: RecurrenceScope) => void;
}) {
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalDialog({ dialogRef, onClose });
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-recurrence-scope-title"
        className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Repeat2 className="h-4 w-4" />
          </span>
          <h2
            id="calendar-recurrence-scope-title"
            className="min-w-0 flex-1 text-base font-semibold text-slate-800"
          >
            {intl.formatMessage({ id: "calendar.moveRecurringEvent" })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label={intl.formatMessage({ id: "app.close" })}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1 p-3">
          {Object.values(RecurrenceScope).map((scope) => (
            <button
              key={scope}
              data-modal-initial-focus={scope === RecurrenceScope.THIS || undefined}
              type="button"
              onClick={() => onSelect(scope)}
              className="w-full cursor-pointer rounded-lg px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-800"
            >
              {intl.formatMessage({ id: `calendar.scope.${scope}` })}
            </button>
          ))}
        </div>

        <div className="flex justify-end border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
        </div>
      </div>
    </div>
  );
}
