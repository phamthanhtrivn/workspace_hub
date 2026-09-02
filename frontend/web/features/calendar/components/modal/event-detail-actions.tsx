import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEvent, RecurrenceScope } from "../../types/calendar.types";

interface EventDetailActionsProps {
  event: CalendarEvent;
  busy?: boolean;
  onCancelEvent: (scope: RecurrenceScope) => void;
  onEdit: () => void;
}

export function EventDetailActions({
  event,
  busy,
  onCancelEvent,
  onEdit,
}: EventDetailActionsProps) {
  const intl = useAppIntl();
  const [cancelScope, setCancelScope] = useState(RecurrenceScope.THIS);

  if (!event.permissions?.canManage) return null;

  return (
    <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-5 py-4">
      {(event.recurrenceRule || event.recurrenceParentId) && (
        <select
          value={cancelScope}
          aria-label={intl.formatMessage({ id: "calendar.moveRecurringEvent" })}
          onChange={(changeEvent) =>
            setCancelScope(changeEvent.target.value as RecurrenceScope)
          }
          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
        >
          {Object.values(RecurrenceScope).map((value) => (
            <option key={value} value={value}>
              {intl.formatMessage({ id: `calendar.scope.${value}` })}
            </option>
          ))}
        </select>
      )}
      <button
        type="button"
        onClick={() => onCancelEvent(cancelScope)}
        disabled={busy}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Trash2 className="h-4 w-4" />
        {intl.formatMessage({ id: "calendar.cancelEvent" })}
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--color-primary)]"
      >
        <Pencil className="h-4 w-4" />
        {intl.formatMessage({ id: "calendar.editEvent" })}
      </button>
    </div>
  );
}
