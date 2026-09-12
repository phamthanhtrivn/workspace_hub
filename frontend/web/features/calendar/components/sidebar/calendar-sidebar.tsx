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
  onCreateCalendar,
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
  onCreateCalendar?: () => void;
}) {
  const intl = useAppIntl();

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-r border-slate-200 bg-white">
      <div className="px-4 pb-2 pt-4">
        <button
          type="button"
          onClick={onCreateEvent}
          className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.98] active:shadow-xs"
        >
          <div className="grid h-6 w-6 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Plus className="h-4 w-4 stroke-[2.5]" />
          </div>
          <span>{intl.formatMessage({ id: "calendar.newEvent" })}</span>
        </button>
      </div>

      <MiniCalendar
        currentDate={currentDate}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <div className="min-h-0 flex-1 px-3 py-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-semibold text-slate-700">
              {intl.formatMessage({ id: "calendar.myCalendars" })}
            </h2>
          </div>
          {onCreateCalendar && (
            <button
              type="button"
              onClick={onCreateCalendar}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label={intl.formatMessage({ id: "calendar.createCalendar" })}
              title={intl.formatMessage({ id: "calendar.createCalendar" })}
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
        {(() => {
          const personalCalendars = calendars.filter((c) => !c.projectId);
          const projectCalendars = calendars.filter((c) => !!c.projectId);

          return (
            <>
              {personalCalendars.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-xs font-semibold text-slate-400">
                  {intl.formatMessage({ id: "calendar.noCalendars" })}
                </div>
              ) : (
                <div className="space-y-1">
                  {personalCalendars.map((calendar) => {
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

              <ProjectCalendarsSection
                calendars={projectCalendars}
                selectedCalendarIds={selectedCalendarIds}
                onToggleCalendar={onToggleCalendar}
              />
            </>
          );
        })()}
      </div>
    </aside>
  );
}
