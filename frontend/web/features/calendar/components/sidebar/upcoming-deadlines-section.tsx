"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CALENDAR_DEFAULT_EVENT_COLOR } from "../../types/calendar.constants";
import { CalendarEvent, EventStatus } from "../../types/calendar.types";

function formatRelativeBadge(startMs: number, nowMs: number, timeZone: string) {
  const diffHours = Math.round((startMs - nowMs) / 3_600_000);
  if (diffHours <= 0) {
    return {
      label: "Now",
      className:
        "border-destructive-outline bg-destructive-soft text-destructive-content",
    };
  }
  if (diffHours < 12) {
    return {
      label: `In ${diffHours}h`,
      className: "border-warning-outline bg-warning-soft text-warning-content",
    };
  }

  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(nowMs),
  );
  const tomorrowKey = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(nowMs + 86_400_000),
  );
  const eventKey = new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(startMs),
  );

  if (eventKey === todayKey) {
    return {
      label: "Today",
      className: "border-warning-outline bg-warning-soft text-warning-content",
    };
  }
  if (eventKey === tomorrowKey) {
    return {
      label: "Tomorrow",
      className: "border-info-outline bg-info-soft text-info-content",
    };
  }

  return {
    label: new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
    }).format(new Date(startMs)),
    className: "border-border bg-muted text-muted-foreground",
  };
}

export function UpcomingDeadlinesSection({
  events,
  timeZone,
  onSelectEvent,
}: {
  events: CalendarEvent[];
  timeZone: string;
  onSelectEvent: (event: CalendarEvent) => void;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 60_000);

    return () => clearInterval(timer);
  }, []);

  const upcoming = useMemo(() => {
    const cutoff = nowMs - 3_600_000;

    return events
      .filter(
        (ev) =>
          !ev.completedAt &&
          !ev.cancelledAt &&
          ev.status !== EventStatus.CANCELLED &&
          Date.parse(ev.startAt) >= cutoff,
      )
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))
      .slice(0, 3);
  }, [events, nowMs]);

  if (upcoming.length === 0) return null;

  return (
    <section
      className="mt-4 space-y-2 border-t border-border pt-3"
      aria-label="Upcoming deadlines"
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Upcoming Deadlines
        </span>
        <span className="text-[11px] font-semibold text-link tabular-nums">
          {upcoming.length} due
        </span>
      </div>

      <div className="space-y-1.5">
        {upcoming.map((item) => {
          const startMs = Date.parse(item.startAt);
          const badge = formatRelativeBadge(startMs, nowMs, timeZone);
          const dotColor =
            item.color || item.calendar?.color || CALENDAR_DEFAULT_EVENT_COLOR;
          const timeLabel = item.allDay
            ? new Intl.DateTimeFormat("en-US", {
                timeZone,
                month: "short",
                day: "numeric",
              }).format(new Date(startMs))
            : `${new Intl.DateTimeFormat("en-US", {
                timeZone,
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }).format(new Date(startMs))} · ${new Intl.DateTimeFormat(
                "en-US",
                {
                  timeZone,
                  month: "short",
                  day: "numeric",
                },
              ).format(new Date(startMs))}`;

          return (
            <Button
              key={item.id}
              type="button"
              variant="unstyled"
              onClick={() => onSelectEvent(item)}
              className="block h-auto w-full rounded-control border border-border bg-card p-2 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: dotColor }}
                    aria-hidden="true"
                  />
                  <span className="truncate text-xs font-semibold text-foreground">
                    {item.title}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              <span className="mt-0.5 block pl-3.5 text-[10px] text-muted-foreground tabular-nums">
                {timeLabel}
              </span>
            </Button>
          );
        })}
      </div>
    </section>
  );
}
