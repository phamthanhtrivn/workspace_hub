"use client";

import FullCalendar from "@fullcalendar/react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { CalendarSidebar } from "../sidebar/calendar-sidebar";
import { CalendarToolbar } from "../toolbar/calendar-toolbar";
import { CalendarGrid } from "./calendar-grid";
import { CalendarTasksDrawer } from "../drawer/calendar-tasks-drawer";
import { useCalendarWorkspace } from "../../hooks/use-calendar-workspace";
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
import type { CalendarModalValues } from "../modal/calendar-modal";

const EventDetailModal = dynamic(() =>
  import("../modal/event-detail-modal").then(
    (module) => module.EventDetailModal,
  ),
);
const loadEventFormModal = () =>
  import("../modal/event-form-modal").then((module) => module.EventFormModal);
const EventFormModal = dynamic(loadEventFormModal);
const RecurrenceScopeModal = dynamic(() =>
  import("../modal/recurrence-scope-modal").then(
    (module) => module.RecurrenceScopeModal,
  ),
);
const CalendarModal = dynamic(() =>
  import("../modal/calendar-modal").then((module) => module.CalendarModal),
);

export function CalendarWorkspace() {
  const intl = useAppIntl();
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendar = useCalendarWorkspace(calendarRef);
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
      toast.success(intl.formatMessage({ id: "calendar.calendarCreated" }));
      return true;
    } catch {
      toast.error(
        intl.formatMessage({ id: "calendar.calendarCreateFailed" }),
      );
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
    void loadEventFormModal();
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

  const calendarEvents = calendar.events;
  const tasksData = tasksQuery.data;

  // Merge tasks from dedicated query + visible calendar events (guarantees tasks on the calendar grid are NEVER missing)
  const allTasks = useMemo(() => {
    const taskMap = new Map<string, CalendarEvent>();

    // 1. Tasks from dedicated paginated task query (across all dates)
    if (Array.isArray(tasksData)) {
      for (const t of tasksData) {
        if (isTaskCalendarEvent(t) && t.status !== EventStatus.CANCELLED) {
          taskMap.set(t.id, t);
        }
      }
    }

    // 2. Tasks from current workspace calendar events (guarantees tasks visible on grid are never missing)
    const workspaceEvents = Array.isArray(calendarEvents) ? calendarEvents : [];
    for (const e of workspaceEvents) {
      if (isTaskCalendarEvent(e) && e.status !== EventStatus.CANCELLED) {
        taskMap.set(e.id, e);
      }
    }

    return Array.from(taskMap.values());
  }, [tasksData, calendarEvents]);

  return (
    <section className="relative h-full w-full overflow-hidden bg-white">
      {mobileSidebarOpen && (
        <Button
          type="button"
          variant="ghost"
          className="fixed inset-0 z-40 h-auto w-auto cursor-default rounded-none bg-slate-950/30 p-0 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label={intl.formatMessage({ id: "app.close" })}
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
              onToggleCalendar={calendar.toggleCalendar}
              onToggleTasks={calendar.toggleTasks}
              onOpenTasksDrawer={handleOpenTasksDrawer}
              onTasksColorChange={calendar.changeTasksColor}
              onSelectDate={(date) => {
                calendar.handleMiniCalendarDateSelect(date);
                setMobileSidebarOpen(false);
              }}
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
                  {intl.formatMessage({ id: "calendar.loadFailed" })}
                </p>
              </div>
            </div>
          ) : (
            <CalendarGrid
              calendarRef={calendarRef}
              events={calendar.fullCalendarEvents}
              timeZone={calendar.displayTimeZone}
              loading={calendar.loading}
              onDatesSet={calendar.handleDatesSet}
              onSelect={calendar.handleSelect}
              onDateClick={calendar.handleDateClick}
              onEventClick={calendar.handleEventClick}
              onEventMove={calendar.handleEventMove}
              onTaskCompletionToggle={calendar.handleTaskCompletionQuickToggle}
              taskCompletionBusy={calendar.taskCompletionBusy}
            />
          )}
        </div>

        <CalendarTasksDrawer
          open={tasksDrawerOpen}
          tasks={allTasks}
          color={calendar.tasksColor}
          loading={tasksQuery.isLoading && allTasks.length === 0}
          error={tasksQuery.isError}
          showCompleted={calendar.showCompletedTasks}
          onToggleShowCompleted={calendar.toggleShowCompletedTasks}
          onClose={handleCloseTasksDrawer}
          onRetry={() => void tasksQuery.refetch()}
          onToggleTask={calendar.handleTaskCompletionQuickToggle}
          onSelectTask={(task) => calendar.openDetail(task)}
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
