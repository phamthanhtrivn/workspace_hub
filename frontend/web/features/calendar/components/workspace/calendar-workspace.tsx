"use client";

import FullCalendar from "@fullcalendar/react";
import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarSidebar } from "../sidebar/calendar-sidebar";
import { CalendarToolbar } from "../toolbar/calendar-toolbar";
import { CalendarGrid } from "./calendar-grid";
import { CalendarTasksDrawer } from "../drawer/calendar-tasks-drawer";
import { useCalendarWorkspace } from "../../hooks/use-calendar-workspace";
import { useCalendarKeyboardShortcuts } from "../../hooks/use-calendar-keyboard-shortcuts";
import { useCalendarTasks } from "../../hooks/use-calendar-queries";
import { isTaskCalendarEvent } from "../../utils/calendar-event.utils";
import {
  CalendarEvent,
  EventSourceType,
  EventStatus,
} from "../../types/calendar.types";

const EventDetailModal = dynamic(() =>
  import("../modal/event-detail-modal").then(
    (module) => module.EventDetailModal,
  ),
);
const EventFormModal = dynamic(() =>
  import("../modal/event-form-modal").then((module) => module.EventFormModal),
);
const RecurrenceScopeModal = dynamic(() =>
  import("../modal/recurrence-scope-modal").then(
    (module) => module.RecurrenceScopeModal,
  ),
);
const CreateCalendarModal = dynamic(() =>
  import("../modal/create-calendar-modal").then(
    (module) => module.CreateCalendarModal,
  ),
);

export function CalendarWorkspace() {
  const intl = useAppIntl();
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendar = useCalendarWorkspace(calendarRef);
  const tasksQuery = useCalendarTasks();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasksDrawerOpen, setTasksDrawerOpen] = useState(false);
  const [createCalendarOpen, setCreateCalendarOpen] = useState(false);
  const { handleCalendarNavigate, handleViewChange, openCreateModal } =
    calendar;

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
    setTasksDrawerOpen(true);
  }, []);

  const handleCloseTasksDrawer = useCallback(() => {
    setTasksDrawerOpen(false);
  }, []);

  const handleAddTaskFromDrawer = useCallback(() => {
    const defaultCal =
      calendar.calendars.find((c) => !c.projectId && c.isDefault) ??
      calendar.calendars.find((c) => !c.projectId);
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    calendar.openCreateModal({
      startAt: now,
      endAt: oneHourLater,
      calendarId: defaultCal?.id,
      sourceType: EventSourceType.TASK,
    });
  }, [calendar]);

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
    <section className="relative h-[calc(100dvh-7.5rem)] min-h-[680px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      {sidebarOpen && (
        <button
          type="button"
          className="absolute inset-0 z-20 cursor-default bg-slate-950/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label={intl.formatMessage({ id: "app.close" })}
        />
      )}
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[256px_minmax(0,1fr)]">
        <div
          className={`absolute inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <CalendarSidebar
            calendars={calendar.calendars}
            currentDate={calendar.currentDate}
            selectedCalendarIds={calendar.selectedCalendarIds}
            selectedDate={calendar.selectedDate}
            tasksVisible={calendar.tasksVisible}
            tasksColor={calendar.tasksColor}
            onToggleCalendar={calendar.toggleCalendar}
            onToggleTasks={calendar.toggleTasks}
            onOpenTasksDrawer={handleOpenTasksDrawer}
            onTasksColorChange={calendar.changeTasksColor}
            onSelectDate={(date) => {
              calendar.handleMiniCalendarDateSelect(date);
              setSidebarOpen(false);
            }}
            onCreateEvent={() => {
              calendar.openCreateModal();
              setSidebarOpen(false);
            }}
            onCreateCalendar={() => {
              setCreateCalendarOpen(true);
              setSidebarOpen(false);
            }}
          />
        </div>

        <div className="flex min-h-0 flex-col bg-slate-50/60">
          <CalendarToolbar
            title={calendar.title}
            activeView={calendar.activeView}
            onViewChange={calendar.handleViewChange}
            onNavigate={calendar.handleCalendarNavigate}
            onToggleSidebar={() => setSidebarOpen((current) => !current)}
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
      </div>

      <CalendarTasksDrawer
        open={tasksDrawerOpen}
        tasks={allTasks}
        color={calendar.tasksColor}
        loading={tasksQuery.isLoading && allTasks.length === 0}
        showCompleted={calendar.showCompletedTasks}
        onToggleShowCompleted={calendar.toggleShowCompletedTasks}
        onClose={handleCloseTasksDrawer}
        onAddTask={handleAddTaskFromDrawer}
        onToggleTask={calendar.handleTaskCompletionQuickToggle}
        onSelectTask={(task) => calendar.openDetail(task)}
      />

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
          onClose={calendar.closeDetail}
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
        <CreateCalendarModal
          open
          onClose={() => setCreateCalendarOpen(false)}
        />
      )}
    </section>
  );
}
