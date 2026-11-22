"use client";

import { CalendarDays, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import { formatInTimezone, timezoneOffsetLabel } from "@/lib/timezone";

export function WorkspaceClock({
  onOpenSettings,
}: {
  onOpenSettings: () => void;
}) {
  const timeZone = useAccountTimezone();
  const now = useCurrentTime();
  const label = timezoneOffsetLabel(timeZone, now ?? undefined);
  const date = now
    ? formatInTimezone(
        now,
        "en-GB",
        { day: "2-digit", month: "2-digit", year: "numeric" },
        timeZone,
      )
    : "--/--/----";
  const timeParts = now
    ? new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h12",
      }).formatToParts(now)
    : [];
  const time = now
    ? timeParts
        .filter(({ type }) => type !== "dayPeriod")
        .map(({ value }) => value)
        .join("")
        .trim()
    : "--:--";
  const dayPeriod =
    timeParts.find(({ type }) => type === "dayPeriod")?.value ?? "";
  const spokenTime = [time, dayPeriod].filter(Boolean).join(" ");

  return (
    <Button
      variant="unstyled"
      onClick={onOpenSettings}
      title={`${date} · ${spokenTime} · ${label}. Change timezone in Settings.`}
      aria-label={`${date}, ${spokenTime}, ${label}. Open timezone settings`}
      className="flex h-11 min-w-0 shrink-0 flex-col items-start justify-center gap-0 rounded-control px-2 py-0 text-left font-normal text-foreground transition-colors duration-150 hover:bg-accent sm:flex-row sm:items-center sm:gap-3 sm:px-3"
    >
      <span
        aria-hidden="true"
        className="hidden size-9 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-content sm:flex"
      >
        <CalendarDays className="size-5" />
      </span>
      <span
        aria-hidden="true"
        className="hidden h-7 w-px shrink-0 bg-border sm:block"
      />
      <time
        dateTime={now?.toISOString()}
        className="flex flex-col whitespace-nowrap tabular-nums"
      >
        <span className="flex items-baseline gap-1.5">
          <span className="text-base leading-5 font-semibold tracking-tight">
            {time}
          </span>
          {dayPeriod && (
            <span className="text-xs leading-4 font-medium text-muted-foreground">
              {dayPeriod}
            </span>
          )}
        </span>
        <span className="hidden text-xs leading-4 text-muted-foreground sm:block">
          {date}
        </span>
      </time>
      <span className="inline-flex h-5 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-info-soft px-2 text-xs leading-4 font-medium tabular-nums text-info-content sm:h-7 sm:px-2.5">
        <Clock3 aria-hidden="true" className="hidden size-3.5 sm:block" />
        {label}
      </span>
    </Button>
  );
}
