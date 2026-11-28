import { Repeat2 } from "lucide-react";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import type { CalendarEvent } from "../../types/calendar.types";
import { formatRecurrenceRuleSummary } from "../../utils/calendar-recurrence.utils";

export function CalendarEventRecurrenceDetails({
  event,
}: {
  event: Pick<CalendarEvent, "recurrenceRule" | "originalStartAt" | "startAt" | "timeZone">;
}) {
  if (!event.recurrenceRule) return null;

  const summary = formatRecurrenceRuleSummary(event.recurrenceRule, {
    startAt: event.originalStartAt ?? event.startAt,
    timeZone: event.timeZone,
  });

  return (
    <div className="flex items-start gap-4">
      <div className="mt-0.5 flex w-5 shrink-0 justify-center">
        <Repeat2 aria-hidden="true" className="size-4 text-muted-foreground" />
      </div>
      <p className="min-w-0 flex-1 break-words text-sm leading-relaxed text-foreground">
        <span className="sr-only">{copy.recurrence}: </span>
        {summary}
      </p>
    </div>
  );
}
