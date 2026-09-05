"use client";

import FullCalendar from "@fullcalendar/react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarSidebar } from "../sidebar/calendar-sidebar";
import { CalendarToolbar } from "../toolbar/calendar-toolbar";
import { CalendarGrid } from "./calendar-grid";
import { useCalendarWorkspace } from "../../hooks/use-calendar-workspace";
import { useCalendarKeyboardShortcuts } from "../../hooks/use-calendar-keyboard-shortcuts";

const EventDetailModal = dynamic(() =>
  import("../modal/event-detail-modal").then((module) => module.EventDetailModal),
);
const EventFormModal = dynamic(() =>
  import("../modal/event-form-modal").then((module) => module.EventFormModal),
);
const RecurrenceScopeModal = dynamic(() =>
  import("../modal/recurrence-scope-modal").then(
    (module) => module.RecurrenceScopeModal,
  ),
);

export function CalendarWorkspace() {
  const intl = useAppIntl();
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendar = useCalendarWorkspace(calendarRef);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    handleCalendarNavigate,
    handleViewChange,
    openCreateModal,
  } = calendar;

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

  return (
    <section className="relative h-[calc(100dvh-7.5rem)] min-h-[680px] overflow-hidden bg-white">
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
            onTasksColorChange={calendar.changeTasksColor}
            onSelectDate={(date) => {
              calendar.handleMiniCalendarDateSelect(date);
              setSidebarOpen(false);
            }}
            onCreateEvent={() => {
              calendar.openCreateModal();
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
            />
          )}
        </div>
      </div>

      {(calendar.draft || calendar.editingEvent) && (
        <EventFormModal
          key={calendar.editingEvent?.id || calendar.draft?.startAt.toISOString()}
          open
          calendars={calendar.calendars}
          initialDraft={calendar.draft}
          event={calendar.editingEvent}
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
          onClose={calendar.closeDetail}
          onEdit={calendar.startEditingDetailEvent}
          onCancelEvent={calendar.handleCancelEvent}
          onRespond={calendar.handleRespond}
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
    </section>
  );
}
