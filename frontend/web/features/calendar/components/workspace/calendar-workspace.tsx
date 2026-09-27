"use client";

import FullCalendar from "@fullcalendar/react";
import type { EventClickArg } from "@fullcalendar/core";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProjectTasks } from "@/features/project/hooks/use-tasks";
import type { Task } from "@/features/project/types/project";
import { CalendarSidebar } from "../sidebar/calendar-sidebar";
import { CalendarToolbar } from "../toolbar/calendar-toolbar";
import { CalendarGrid } from "./calendar-grid";
import { CalendarTasksDrawer } from "../drawer/calendar-tasks-drawer";
import { CalendarModal, type CalendarModalValues } from "../modal/calendar-modal";
import { EventDetailModal } from "../modal/event-detail-modal";
import { EventFormModal } from "../modal/event-form-modal";
import { useCalendarWorkspace } from "../../hooks/use-calendar-workspace";
import { useCalendarProjects } from "../../hooks/use-calendar-projects";
import {
  mapProjectTasksToCalendarEvents,
  mapProjectTasksToDomainCalendarEvents,
} from "../../utils/project-task-event.utils";
import { ProjectTaskDetailModal } from "../modal/project-task-detail-modal";
import { useQueryClient } from "@tanstack/react-query";
import { useCalendarKeyboardShortcuts } from "../../hooks/use-calendar-keyboard-shortcuts";
import {
  calendarKeys,
  useCalendarEvent,
  useCalendarTasks,
  useCreateCalendar,
} from "../../hooks/use-calendar-queries";
import { isTaskCalendarEvent } from "../../utils/calendar-event.utils";
import { CalendarEvent, EventStatus } from "../../types/calendar.types";

const RecurrenceScopeModal = dynamic(() =>
  import("../modal/recurrence-scope-modal").then(
    (module) => module.RecurrenceScopeModal,
  ),
);

export function CalendarWorkspace() {

  const calendarRef = useRef<FullCalendar | null>(null);
  const calendar = useCalendarWorkspace(calendarRef);
  const projectsQuery = useCalendarProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectTask, setSelectedProjectTask] = useState<Task | null>(null);
  const projects = projectsQuery.data ?? [];
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const projectTasksQuery = useProjectTasks(selectedProject?.id ?? "");
  const projectTaskEvents = useMemo(
    () => mapProjectTasksToCalendarEvents(projectTasksQuery.data ?? [], selectedProject),
    [projectTasksQuery.data, selectedProject],
  );
  const domainProjectTaskEvents = useMemo(
    () => mapProjectTasksToDomainCalendarEvents(projectTasksQuery.data ?? [], selectedProject),
    [projectTasksQuery.data, selectedProject],
  );
  const displayEvents = useMemo(
    () => [...calendar.fullCalendarEvents, ...projectTaskEvents],
    [calendar.fullCalendarEvents, projectTaskEvents],
  );
  const tasksQuery = useCalendarTasks();
  const createCalendar = useCreateCalendar();
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [createCalendarOpen, setCreateCalendarOpen] = useState(false);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const eventParam = searchParams.get("event") || searchParams.get("eventId");
  const timeParam = searchParams.get("t");
  const lastOpenedKeyRef = useRef<string | null>(null);
  const directEventQuery = useCalendarEvent(eventParam);

  const handleCreateCalendar = async (values: CalendarModalValues) => {
    try {
      await createCalendar.mutateAsync({
        ...values,
        isVisible: true,
      });
      toast.success("Calendar created");
      return true;
    } catch {
      toast.error("Failed to create calendar");
      return false;
    }
  };

  const {
    handleCalendarNavigate,
    handleViewChange,
    openCreateModal,
    openDetail,
    handleMiniCalendarDateSelect,
  } = calendar;

  const handleCloseDetail = useCallback(() => {
    calendar.closeDetail();
    lastOpenedKeyRef.current = null;
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [calendar]);

  useEffect(() => {
    if (eventParam) {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    }
  }, [eventParam, timeParam, queryClient]);

  useEffect(() => {
    if (!eventParam) return;

    const currentKey = `${eventParam}_${timeParam || ""}`;
    const foundInEvents = calendar.events.find((e) => e.id === eventParam);
    const targetEvent = directEventQuery.data || foundInEvents;

    if (targetEvent) {
      if (lastOpenedKeyRef.current !== currentKey || !calendar.detailEvent) {
        openDetail(targetEvent);
        if (targetEvent.startAt) {
          handleMiniCalendarDateSelect(new Date(targetEvent.startAt));
        }
        lastOpenedKeyRef.current = currentKey;
      } else if (
        directEventQuery.data &&
        calendar.detailEvent?.id === eventParam
      ) {
        // Keep modal in sync with fresh data if direct query loads later
        openDetail(directEventQuery.data);
      }
    }
  }, [
    eventParam,
    timeParam,
    calendar.events,
    calendar.detailEvent,
    directEventQuery.data,
    openDetail,
    handleMiniCalendarDateSelect,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("calendar_sidebar_open");
        if (saved !== null) {
          setDesktopSidebarOpen(saved === "true");
        }
      } catch {
        // ignore
      }
    });
  }, []);

  const handleToggleSidebar = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setDesktopSidebarOpen((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("calendar_sidebar_open", String(next));
        } catch {
          // ignore
        }
        return next;
      });
    } else {
      setMobileSidebarOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      calendarRef.current?.getApi().updateSize();
    }, 320);
    return () => clearTimeout(timer);
  }, [desktopSidebarOpen]);

  const createFromShortcut = useCallback(() => {
    openCreateModal();
  }, [openCreateModal]);
  const navigateTodayFromShortcut = useCallback(() => {
    handleCalendarNavigate("today");
  }, [handleCalendarNavigate]);

  useCalendarKeyboardShortcuts({
    onCreate: createFromShortcut,
    onToday: navigateTodayFromShortcut,
    onViewChange: handleViewChange,
  });

  const handleOpenTasksDrawer = useCallback(() => {
    setTasksDrawerOpen((prev) => !prev);
  }, []);

  const handleCloseTasksDrawer = useCallback(() => {
    setTasksDrawerOpen(false);
  }, []);

  const handleToggleProject = useCallback((projectId: string) => {
    setSelectedProjectId((current) => current === projectId ? null : projectId);
    setSelectedProjectTask(null);
  }, []);

  const handlePersonalEventClick = calendar.handleEventClick;
  const handleEventClick = useCallback((arg: EventClickArg) => {
    const projectTask = arg.event.extendedProps.projectTask as Task | undefined;
    if (projectTask) {
      setSelectedProjectTask(projectTask);
      return;
    }
    handlePersonalEventClick(arg);
  }, [handlePersonalEventClick]);

  const handleSelectDate = useCallback((date: Date) => {
    handleMiniCalendarDateSelect(date);
    setMobileSidebarOpen(false);
  }, [handleMiniCalendarDateSelect]);

  const handleRetryProjects = useCallback(() => {
    if (projectsQuery.isError) void projectsQuery.refetch();
    if (projectTasksQuery.isError) void projectTasksQuery.refetch();
  }, [projectsQuery, projectTasksQuery]);

  const calendarEvents = calendar.events;
  const tasksData = tasksQuery.data;
  const projectCalendarIds = useMemo(
    () => new Set(calendar.calendars.filter((item) => item.projectId).map((item) => item.id)),
    [calendar.calendars],
  );

  // Merge tasks from dedicated query + visible calendar events (guarantees tasks on the calendar grid are NEVER missing)
  const allTasks = useMemo(() => {
    const taskMap = new Map<string, CalendarEvent>();

    // 1. Tasks from dedicated paginated task query (across all dates)
    if (Array.isArray(tasksData)) {
      for (const t of tasksData) {
        if (isTaskCalendarEvent(t) && t.status !== EventStatus.CANCELLED && !t.calendar?.projectId && !projectCalendarIds.has(t.calendarId)) {
          taskMap.set(t.id, t);
        }
      }
    }

    // 2. Tasks from current workspace calendar events (guarantees tasks visible on grid are never missing)
    const workspaceEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
    for (const e of workspaceEvents) {
      if (isTaskCalendarEvent(e) && e.status !== EventStatus.CANCELLED && !e.calendar?.projectId && !projectCalendarIds.has(e.calendarId)) {
        taskMap.set(e.id, e);
      }
    }

    return Array.from(taskMap.values());
  }, [tasksData, calendarEvents, projectCalendarIds]);

  return (
    <section className="relative h-full w-full overflow-hidden bg-white">
      {mobileSidebarOpen && (
        <Button
          type="button"
          variant="ghost"
          className="fixed inset-0 z-40 h-auto w-auto cursor-default rounded-none bg-slate-950/30 p-0 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close"
        />
      )}
      <div className="flex h-full min-h-0 w-full overflow-hidden">
        <div
          className={cn(
            "z-30 shrink-0 transform transition-all duration-300 ease-in-out",
            "fixed inset-y-0 left-0 w-64 lg:static lg:inset-auto",
            mobileSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0",
            desktopSidebarOpen
              ? "lg:w-64 lg:opacity-100"
              : "lg:w-0 lg:overflow-hidden lg:opacity-0 lg:border-none",
          )}
        >
          <div className="h-full w-64">
            <CalendarSidebar
              calendars={calendar.calendars}
              currentDate={calendar.currentDate}
              selectedCalendarIds={calendar.selectedCalendarIds}
              selectedDate={calendar.selectedDate}
              tasksVisible={calendar.tasksVisible}
              tasksColor={calendar.tasksColor}
              tasksDrawerOpen={tasksDrawerOpen}
              projects={projects}
              selectedProjectId={selectedProject?.id ?? null}
              projectsLoading={projectsQuery.isLoading}
              projectsError={projectsQuery.isError}
              projectTasksError={projectTasksQuery.isError}
              onToggleProject={handleToggleProject}
              onRetryProjects={handleRetryProjects}
              onToggleCalendar={calendar.toggleCalendar}
              onToggleTasks={calendar.toggleTasks}
              onOpenTasksDrawer={handleOpenTasksDrawer}
              onTasksColorChange={calendar.changeTasksColor}
              onSelectDate={handleSelectDate}
              onCreateEvent={() => {
                calendar.openCreateModal();
                setMobileSidebarOpen(false);
              }}
              onCreateCalendar={() => {
                setCreateCalendarOpen(true);
                setMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/60">
          <CalendarToolbar
            title={calendar.title}
            activeView={calendar.activeView}
            onViewChange={calendar.handleViewChange}
            onNavigate={calendar.handleCalendarNavigate}
            onToggleSidebar={handleToggleSidebar}
          />

          {calendar.hasError ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="rounded-xl border border-red-100 bg-white px-5 py-4 text-center shadow-sm">
                <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
                <p className="mt-2 text-sm font-bold text-slate-700">
                  Failed to load calendar events
                </p>
              </div>
            </div>
          ) : (
            <CalendarGrid
              calendarRef={calendarRef}
              events={displayEvents}
              timeZone={calendar.displayTimeZone}
              loading={calendar.loading || projectTasksQuery.isLoading}
              onDatesSet={calendar.handleDatesSet}
              onSelect={calendar.handleSelect}
              onDateClick={calendar.handleDateClick}
              onEventClick={handleEventClick}
              onEventMove={calendar.handleEventMove}
              onTaskCompletionToggle={calendar.handleTaskCompletionQuickToggle}
              taskCompletionBusy={calendar.taskCompletionBusy}
            />
          )}
        </div>

        <CalendarTasksDrawer
          open={tasksDrawerOpen}
          tasks={allTasks}
          projectTaskEvents={domainProjectTaskEvents}
          projects={projects}
          selectedProject={selectedProject}
          onSelectProject={handleToggleProject}
          color={calendar.tasksColor}
          loading={tasksQuery.isLoading && allTasks.length === 0}
          error={tasksQuery.isError}
          showCompleted={calendar.showCompletedTasks}
          onToggleShowCompleted={calendar.toggleShowCompletedTasks}
          onClose={handleCloseTasksDrawer}
          onRetry={() => void tasksQuery.refetch()}
          onToggleTask={calendar.handleTaskCompletionQuickToggle}
          onSelectTask={(task) => {
            const projectTask = task.extendedProps?.projectTask as Task | undefined;
            if (projectTask) {
              setSelectedProjectTask(projectTask);
            } else {
              calendar.openDetail(task);
            }
          }}
        />
      </div>

      {(calendar.draft || calendar.editingEvent) && (
        <EventFormModal
          key={
            calendar.editingEvent?.id || calendar.draft?.startAt.toISOString()
          }
          open
          calendars={calendar.calendars}
          initialDraft={calendar.draft}
          event={calendar.editingEvent}
          tasksColor={calendar.tasksColor}
          onClose={calendar.closeForm}
          onSubmit={calendar.handleSubmitEvent}
          submitting={calendar.formSubmitting}
        />
      )}

      {calendar.detailEvent && (
        <EventDetailModal
          key={calendar.detailEvent.id}
          open
          event={calendar.detailEvent}
          tasksColor={calendar.tasksColor}
          onClose={handleCloseDetail}
          onEdit={calendar.startEditingDetailEvent}
          onCancelEvent={calendar.handleCancelEvent}
          onRespond={calendar.handleRespond}
          onTaskCompletionChange={calendar.handleTaskCompletionChange}
          busy={calendar.detailBusy}
        />
      )}

      {selectedProject && selectedProjectTask && (
        <ProjectTaskDetailModal
          task={selectedProjectTask}
          project={selectedProject}
          onClose={() => setSelectedProjectTask(null)}
        />
      )}

      {calendar.pendingEventMove && (
        <RecurrenceScopeModal
          open
          onClose={calendar.cancelPendingEventMove}
          onSelect={calendar.confirmEventMove}
        />
      )}

      {createCalendarOpen && (
        <CalendarModal
          mode="create"
          pending={createCalendar.isPending}
          onClose={() => setCreateCalendarOpen(false)}
          onSave={handleCreateCalendar}
        />
      )}
    </section>
  );
}
