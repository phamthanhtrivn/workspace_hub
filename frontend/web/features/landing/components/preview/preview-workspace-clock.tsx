import { CalendarDays, Clock3 } from "lucide-react";
import { PREVIEW_HEADER_CLOCK as clock } from "./preview-data";

/** A fixed sample of the account clock; never starts a timer or reads user settings. */
export function PreviewWorkspaceClock() {
  return (
    <span
      aria-label={`Sample workspace time: ${clock.date}, ${clock.time} ${clock.period}, ${clock.offset}`}
      className="flex h-11 shrink-0 flex-col items-start justify-center px-2 text-left @min-[640px]/preview:flex-row @min-[640px]/preview:items-center @min-[640px]/preview:gap-3"
    >
      <span
        aria-hidden="true"
        className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-content @min-[640px]/preview:flex"
      >
        <CalendarDays className="size-5" />
      </span>
      <span
        aria-hidden="true"
        className="hidden h-7 w-px shrink-0 bg-border @min-[640px]/preview:block"
      />
      <time
        dateTime={clock.dateTime}
        className="flex flex-col whitespace-nowrap tabular-nums"
      >
        <span className="flex items-baseline gap-1.5">
          <span className="text-base leading-5 font-semibold tracking-tight">
            {clock.time}
          </span>
          <span className="text-xs leading-4 font-medium text-muted-foreground">
            {clock.period}
          </span>
        </span>
        <span className="hidden text-xs leading-4 text-muted-foreground @min-[640px]/preview:block">
          {clock.date}
        </span>
      </time>
      <span className="inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-info-soft px-2 text-xs leading-4 font-medium tabular-nums text-info-content @min-[640px]/preview:h-7 @min-[640px]/preview:px-2.5">
        <Clock3
          aria-hidden="true"
          className="hidden size-3.5 @min-[640px]/preview:block"
        />
        {clock.offset}
      </span>
    </span>
  );
}
