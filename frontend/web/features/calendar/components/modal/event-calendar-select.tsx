"use client";

import type { CSSProperties } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import type { WorkspaceCalendar } from "../../types/calendar.types";

interface EventCalendarSelectProps {
  calendars: WorkspaceCalendar[];
  value: string;
  onChange: (calendarId: string) => void;
  disabled?: boolean;
}

function calendarColorStyle(color?: string): CSSProperties {
  return { "--calendar-color": color || "var(--primary)" } as CSSProperties;
}

function CalendarLabel({
  calendar,
}: {
  calendar: Pick<WorkspaceCalendar, "name" | "icon">;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden="true"
        className="size-3.5 shrink-0 rounded-full border border-foreground/20 bg-[var(--calendar-color)]"
      />
      {calendar.icon && (
        <span aria-hidden="true" className="shrink-0 text-base leading-none">
          {calendar.icon}
        </span>
      )}
      <span className="truncate">{calendar.name}</span>
    </span>
  );
}

export function EventCalendarSelect({
  calendars,
  value,
  onChange,
  disabled,
}: EventCalendarSelectProps) {
  const selectedCalendar = calendars.find((calendar) => calendar.id === value);
  const placeholder = calendars.length ? copy.selectCalendar : copy.noCalendars;

  return (
    <Select
      value={value}
      onValueChange={onChange}
      disabled={disabled || calendars.length === 0}
    >
      <SelectTrigger
        aria-label={copy.calendar}
        title={selectedCalendar?.name}
        style={calendarColorStyle(selectedCalendar?.color)}
        className="h-11 rounded-panel bg-[color-mix(in_srgb,var(--calendar-color)_8%,var(--card))] font-semibold hover:bg-[color-mix(in_srgb,var(--calendar-color)_14%,var(--card))]"
      >
        <SelectValue placeholder={placeholder}>
          {selectedCalendar ? (
            <CalendarLabel calendar={selectedCalendar} />
          ) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="w-[var(--radix-select-trigger-width)] rounded-panel">
        {calendars.map((calendar) => (
          <SelectItem
            key={calendar.id}
            value={calendar.id}
            textValue={calendar.name}
            title={calendar.name}
            style={calendarColorStyle(calendar.color)}
            className={cn(
              "min-h-11 px-3 pr-8 data-[highlighted]:bg-[color-mix(in_srgb,var(--calendar-color)_18%,var(--popover))] data-[highlighted]:text-popover-foreground [&>span:last-child]:min-w-0 [&>span:last-child]:flex-1",
              calendar.id === value &&
                "bg-[color-mix(in_srgb,var(--calendar-color)_10%,var(--popover))] font-semibold",
            )}
          >
            <CalendarLabel calendar={calendar} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
