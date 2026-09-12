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
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 px-5 py-3.5">
      {(event.recurrenceRule || event.recurrenceParentId) && (
        <select
          value={cancelScope}
          aria-label={intl.formatMessage({ id: "calendar.moveRecurringEvent" })}
          onChange={(changeEvent) =>
            setCancelScope(changeEvent.target.value as RecurrenceScope)
          }
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          {Object.values(RecurrenceScope).map((value) => (
            <option key={value} value={value}>
              {intl.formatMessage({ id: `calendar.scope.${value}` })}
            </option>
          ))}
        </select>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onCancelEvent(cancelScope)}
          disabled={busy}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 className="h-4 w-4" />
          {intl.formatMessage({ id: "calendar.cancelEvent" })}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.98]"
        >
          <Pencil className="h-4 w-4" />
          {intl.formatMessage({ id: "calendar.editEvent" })}
        </button>
      </div>
    </div>
  );
}
