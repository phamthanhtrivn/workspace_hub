"use client";

import { useState } from "react";
import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { WorkspaceCalendar, CalendarEvent } from "../../types/calendar.types";
import type { Project } from "@/features/project/types/project";
import { CalendarListItem } from "./calendar-list-item";
import { MiniCalendar } from "./mini-calendar";
import { ProjectCalendarsSection } from "./project-calendars-section";
import { TasksCalendarListItem } from "./tasks-calendar-list-item";
import { UpcomingDeadlinesSection } from "./upcoming-deadlines-section";

const CALENDAR_SCROLL_THRESHOLD = 4;

export function CalendarSidebar({
  calendars,
  currentDate,
  selectedCalendarIds,
  selectedDate,
  eventDates,
  upcomingItems = [],
  timeZone = "UTC",
  collapsed = false,
  onToggleCollapse,
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
  onSelectUpcoming,
  onCreateEvent,
  onCreateCalendar,
}: {
  calendars: WorkspaceCalendar[];
  currentDate: Date;
  selectedCalendarIds: Set<string>;
  selectedDate: Date | null;
  eventDates?: Set<string>;
  upcomingItems?: CalendarEvent[];
  timeZone?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
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
  onSelectUpcoming?: (event: CalendarEvent) => void;
  onCreateEvent: () => void;
  onCreateCalendar?: () => void;
}) {
  const [myCalendarsOpen, setMyCalendarsOpen] = useState(true);
  const displayDay = (selectedDate ?? currentDate).getDate();

  if (collapsed) {
    return (
      <aside
        aria-label="Calendar collapsed sidebar"
        className="flex h-full w-12 flex-col items-center justify-between border-r border-border bg-sidebar py-3"
      >
        <div className="flex flex-col items-center gap-2">
          {onToggleCollapse && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapse}
              title="Expand Calendar sidebar"
              aria-label="Expand Calendar sidebar"
              className="size-8 rounded-control text-muted-foreground hover:text-foreground"
            >
              <PanelLeftOpen className="size-4" aria-hidden="true" />
            </Button>
          )}
          <Button
            type="button"
            size="icon-sm"
            onClick={onCreateEvent}
            title="Create event"
            aria-label="Create event"
            className="size-8 rounded-control"
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
          <div className="my-0.5 h-px w-6 bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            title="Mini calendar"
            aria-label="Open mini calendar"
            className="size-8 rounded-control bg-info-soft text-xs font-bold text-info-content"
          >
            {displayDay}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            title="My Calendars"
            aria-label="My Calendars"
            className="size-8 rounded-control text-muted-foreground hover:text-foreground"
          >
            <CalendarIcon className="size-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            title="Projects"
            aria-label="Projects"
            className="size-8 rounded-control text-muted-foreground hover:text-foreground"
          >
            <FolderKanban className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={onToggleCollapse}
          title="Upcoming deadlines"
          aria-label="Upcoming deadlines"
          className="relative size-8 rounded-control bg-card text-muted-foreground hover:text-foreground"
        >
          <AlertCircle className="size-4 text-link" aria-hidden="true" />
          {upcomingItems.length > 0 && (
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-warning-content" />
          )}
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border bg-sidebar">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-md bg-info-soft text-info-content">
            <CalendarIcon className="size-3.5" aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold text-foreground">Calendar</h2>
        </div>
        {onToggleCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse Calendar sidebar"
            className="size-7 rounded-control text-muted-foreground hover:text-foreground"
          >
            <PanelLeftClose className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      <div className="shrink-0 px-3.5 pt-3 pb-1">
        <Button
          type="button"
          onClick={onCreateEvent}
          className="h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-control text-xs font-semibold"
        >
          <Plus className="size-3.5 stroke-[2.5]" aria-hidden="true" />
          <span>Create event</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <MiniCalendar
          currentDate={currentDate}
          selectedDate={selectedDate}
          eventDates={eventDates}
          onSelectDate={onSelectDate}
        />

        <div className="px-3.5 pt-2">
          <div className="border-t border-border pt-3">
            <div className="mb-1.5 flex shrink-0 items-center justify-between px-1">
              <Button
                type="button"
                variant="unstyled"
                onClick={() => setMyCalendarsOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                <CalendarPlus
                  className="size-3.5 text-link"
                  aria-hidden="true"
                />
                <span>My Calendars</span>
                {myCalendarsOpen ? (
                  <ChevronDown className="size-3" aria-hidden="true" />
                ) : (
                  <ChevronRight className="size-3" aria-hidden="true" />
                )}
              </Button>
              {onCreateCalendar && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onCreateCalendar}
                  className="grid size-6 cursor-pointer place-items-center rounded-control text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Create calendar"
                  title="Create calendar"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
            {myCalendarsOpen &&
              (() => {
                const personalCalendars = calendars.filter((c) => !c.projectId);
                const scrollable =
                  personalCalendars.length >= CALENDAR_SCROLL_THRESHOLD;

                return personalCalendars.length === 0 ? (
                  <div className="shrink-0 rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs font-semibold text-muted-foreground">
                    No calendars yet
                  </div>
                ) : (
                  <div className="shrink-0 space-y-1">
                    <div
                      role={scrollable ? "region" : undefined}
                      aria-label={scrollable ? "My calendars list" : undefined}
                      tabIndex={scrollable ? 0 : undefined}
                      className={cn(
                        "space-y-1",
                        scrollable &&
                          "max-h-32 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable] focus-visible:rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [@media(pointer:coarse)]:max-h-44",
                      )}
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
                );
              })()}
          </div>

          <ProjectCalendarsSection
            projects={projects}
            selectedProjectId={selectedProjectId}
            loading={projectsLoading}
            error={projectsError}
            tasksError={projectTasksError}
            onToggleProject={onToggleProject}
            onRetry={onRetryProjects}
          />

          {onSelectUpcoming && (
            <UpcomingDeadlinesSection
              events={upcomingItems}
              timeZone={timeZone}
              onSelectEvent={onSelectUpcoming}
            />
          )}
        </div>
      </div>
    </aside>
  );
}
