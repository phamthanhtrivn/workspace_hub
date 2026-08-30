"use client";

import { CalendarPlus, Plus } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { WorkspaceCalendar } from "../../types/calendar.types";
import { CalendarListItem } from "./calendar-list-item";
import { MiniCalendar } from "./mini-calendar";
import { ProjectCalendarsSection } from "./project-calendars-section";
import { TasksCalendarListItem } from "./tasks-calendar-list-item";

export function CalendarSidebar({
  calendars,
  currentDate,
  selectedCalendarIds,
  selectedDate,
  tasksVisible,
  tasksColor,
  onToggleCalendar,
  onToggleTasks,
  onTasksColorChange,
  onSelectDate,
  onCreateEvent,
}: {
  calendars: WorkspaceCalendar[];
  currentDate: Date;
  selectedCalendarIds: Set<string>;
  selectedDate: Date | null;
  tasksVisible: boolean;
  tasksColor: string;
  onToggleCalendar: (calendarId: string) => void;
  onToggleTasks: () => void;
  onTasksColorChange: (color: string) => void;
  onSelectDate: (date: Date) => void;
  onCreateEvent: () => void;
}) {
  const intl = useAppIntl();

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={onCreateEvent}
          className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-md transition hover:bg-slate-50 hover:shadow-lg"
        >
          <Plus className="h-5 w-5 text-blue-600" />
          {intl.formatMessage({ id: "calendar.newEvent" })}
        </button>
      </div>

      <MiniCalendar
        currentDate={currentDate}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <div className="min-h-0 flex-1 px-3 py-3">
        <div className="mb-2 flex items-center gap-2 px-2">
          <CalendarPlus className="h-4 w-4 text-[var(--color-primary)]" />
          <h2 className="flex-1 text-sm font-semibold text-slate-700">
            {intl.formatMessage({ id: "calendar.myCalendars" })}
          </h2>
        </div>
        {calendars.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-xs font-semibold text-slate-400">
            {intl.formatMessage({ id: "calendar.noCalendars" })}
          </div>
        ) : (
          <div className="space-y-1">
            {calendars.map((calendar) => {
              const selected = selectedCalendarIds.has(calendar.id);
              return (
                <CalendarListItem
                  key={calendar.id}
                  calendar={calendar}
                  selected={selected}
                  onToggle={() => onToggleCalendar(calendar.id)}
                />
              );
            })}
            <TasksCalendarListItem
              selected={tasksVisible}
              color={tasksColor}
              onToggle={onToggleTasks}
              onColorChange={onTasksColorChange}
            />
          </div>
        )}

        <ProjectCalendarsSection />
      </div>
    </aside>
  );
}
