"use client";

import { CalendarPlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { WorkspaceCalendar } from "../../types/calendar.types";
import type { Project } from "@/features/project/types/project";
import { CalendarListItem } from "./calendar-list-item";
import { MiniCalendar } from "./mini-calendar";
import { ProjectCalendarsSection } from "./project-calendars-section";
import { TasksCalendarListItem } from "./tasks-calendar-list-item";

const CALENDAR_SCROLL_THRESHOLD = 4;

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
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-r border-border bg-sidebar">
      <div className="shrink-0 px-4 pb-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCreateEvent}
          className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition-all duration-150 hover:border-input hover:bg-background"
        >
          <div className="grid h-6 w-6 place-items-center rounded-full bg-info-soft text-info-content">
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
            <CalendarPlus className="h-4 w-4 text-link" />
            <h2 className="text-sm font-semibold text-foreground">
              My Calendars
            </h2>
          </div>
          {onCreateCalendar && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCreateCalendar}
              className="grid h-6 w-6 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Create calendar"
              title="Create calendar"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
        {(() => {
          const personalCalendars = calendars.filter((c) => !c.projectId);
          const scrollable = personalCalendars.length >= CALENDAR_SCROLL_THRESHOLD;

          return (
            <>
              {personalCalendars.length === 0 ? (
                <div className="shrink-0 rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs font-semibold text-muted-foreground">
                  No calendars yet
                </div>
              ) : (
                <div className="shrink-0 space-y-1">
                  <div
                    role={scrollable ? "region" : undefined}
                    aria-label={scrollable ? "My calendars list" : undefined}
                    tabIndex={scrollable ? 0 : undefined}
                    className={cn("space-y-1", scrollable && "max-h-32 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable] focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [@media(pointer:coarse)]:max-h-44")}
                  >
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
                  </div>
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
