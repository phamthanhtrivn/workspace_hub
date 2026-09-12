"use client";

import { FolderKanban } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { WorkspaceCalendar } from "../../types/calendar.types";
import { CalendarListItem } from "./calendar-list-item";

export function ProjectCalendarsSection({
  calendars = [],
  selectedCalendarIds = new Set(),
  onToggleCalendar,
}: {
  calendars?: WorkspaceCalendar[];
  selectedCalendarIds?: Set<string>;
  onToggleCalendar?: (calendarId: string) => void;
}) {
  const intl = useAppIntl();

  return (
    <section className="mt-5" aria-labelledby="project-calendars-heading">
      <div className="mb-2 flex items-center gap-2 px-2">
        <FolderKanban className="h-4 w-4 text-[var(--color-primary)]" />
        <h2
          id="project-calendars-heading"
          className="flex-1 text-sm font-semibold text-slate-700"
        >
          {intl.formatMessage({ id: "calendar.projects" })}
        </h2>
      </div>

      {calendars.length === 0 ? (
        <p className="px-8 py-1 text-xs font-medium leading-5 text-slate-400">
          {intl.formatMessage({ id: "calendar.noProjects" })}
        </p>
      ) : (
        <div className="space-y-1">
          {calendars.map((calendar) => {
            const selected = selectedCalendarIds.has(calendar.id);
            return (
              <CalendarListItem
                key={calendar.id}
                calendar={calendar}
                selected={selected}
                onToggle={() => onToggleCalendar?.(calendar.id)}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
