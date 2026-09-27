"use client";

import { CalendarPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import { WorkspaceCalendar } from "../../types/calendar.types";
import type { Project } from "@/features/project/types/project";
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
  tasksDrawerOpen,
  projects,
  selectedProjectId,
  projectsLoading,
  projectsError,
  projectTasksError,
  onToggleProject,
  onRetryProjects,
  onToggleCalendar,
  onToggleTasks,
  onOpenTasksDrawer,
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
  tasksDrawerOpen?: boolean;
  projects: Project[];
  selectedProjectId: string | null;
  projectsLoading: boolean;
  projectsError: boolean;
  projectTasksError: boolean;
  onToggleProject: (projectId: string) => void;
  onRetryProjects: () => void;
  onToggleCalendar: (calendarId: string) => void;
  onToggleTasks: () => void;
  onOpenTasksDrawer?: () => void;
  onTasksColorChange: (color: string) => void;
  onSelectDate: (date: Date) => void;
  onCreateEvent: () => void;
  onCreateCalendar?: () => void;
}) {


  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-r border-slate-200 bg-white [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="shrink-0 px-4 pb-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCreateEvent}
          className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:scale-[0.98] active:shadow-xs"
        >
          <div className="grid h-6 w-6 place-items-center rounded-full bg-blue-50 text-blue-600">
            <Plus className="h-4 w-4 stroke-[2.5]" />
          </div>
          <span>Create event</span>
        </Button>
      </div>

      <div className="shrink-0">
        <MiniCalendar
          currentDate={currentDate}
          selectedDate={selectedDate}
          onSelectDate={onSelectDate}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <div className="mb-2 flex shrink-0 items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-[var(--color-primary)]" />
            <h2 className="text-sm font-semibold text-slate-700">
              My Calendars
            </h2>
          </div>
          {onCreateCalendar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCreateCalendar}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label="Create calendar"
              title="Create calendar"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        {(() => {
          const personalCalendars = calendars.filter((c) => !c.projectId);

          return (
            <>
              {personalCalendars.length === 0 ? (
                <div className="shrink-0 rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center text-xs font-semibold text-slate-400">
                  No calendars yet
                </div>
              ) : (
                <div className="shrink-0 space-y-1">
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
                    isDrawerOpen={tasksDrawerOpen}
                    onToggle={onToggleTasks}
                    onOpenDrawer={onOpenTasksDrawer}
                    onColorChange={onTasksColorChange}
                  />
                </div>
              )}

              <ProjectCalendarsSection
                projects={projects}
                selectedProjectId={selectedProjectId}
                loading={projectsLoading}
                error={projectsError}
                tasksError={projectTasksError}
                onToggleProject={onToggleProject}
                onRetry={onRetryProjects}
              />
            </>
          );
        })()}
      </div>
    </aside>
  );
}
