"use client";

import FullCalendar from "@fullcalendar/react";
import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { EventDetailModal } from "../modal/event-detail-modal";
import { EventFormModal } from "../modal/event-form-modal";
import { RecurrenceScopeModal } from "../modal/recurrence-scope-modal";
import { CalendarSidebar } from "../sidebar/calendar-sidebar";
import { CalendarToolbar } from "../toolbar/calendar-toolbar";
import { CalendarGrid } from "./calendar-grid";
import { useCalendarWorkspace } from "../../hooks/use-calendar-workspace";

export function CalendarWorkspace() {
  const intl = useAppIntl();
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendar = useCalendarWorkspace(calendarRef);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const views: Record<string, string> = {
        m: "dayGridMonth",
        w: "timeGridWeek",
        d: "timeGridDay",
        a: "listWeek",
      };

      if (key === "c") calendar.openCreateModal();
      if (key === "t") calendar.handleCalendarNavigate("today");
      if (views[key]) calendar.handleViewChange(views[key]);
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [calendar]);

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

      <EventFormModal
        key={calendar.editingEvent?.id || calendar.draft?.startAt.toISOString() || "closed-form"}
        open={Boolean(calendar.draft || calendar.editingEvent)}
        calendars={calendar.calendars}
        initialDraft={calendar.draft}
        event={calendar.editingEvent}
        onClose={calendar.closeForm}
        onSubmit={calendar.handleSubmitEvent}
        submitting={calendar.formSubmitting}
      />

      <EventDetailModal
        key={calendar.detailEvent?.id || "closed-detail"}
        open={Boolean(calendar.detailEvent)}
        event={calendar.detailEvent}
        onClose={calendar.closeDetail}
        onEdit={calendar.startEditingDetailEvent}
        onCancelEvent={calendar.handleCancelEvent}
        onRespond={calendar.handleRespond}
        busy={calendar.detailBusy}
      />

      <RecurrenceScopeModal
        open={Boolean(calendar.pendingEventMove)}
        onClose={calendar.cancelPendingEventMove}
        onSelect={calendar.confirmEventMove}
      />
    </section>
  );
}
