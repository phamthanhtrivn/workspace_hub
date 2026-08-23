"use client";

import FullCalendar from "@fullcalendar/react";
import { useRef } from "react";
import { AlertCircle } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { EventDetailModal } from "../event-detail/event-detail-modal";
import { EventFormModal } from "../event-form/event-form-modal";
import { CalendarSidebar } from "../sidebar/calendar-sidebar";
import { CalendarToolbar } from "../toolbar/calendar-toolbar";
import { CalendarGrid } from "./calendar-grid";
import { useCalendarWorkspace } from "../../hooks/use-calendar-workspace";

export function CalendarWorkspace() {
  const intl = useAppIntl();
  const calendarRef = useRef<FullCalendar | null>(null);
  const calendar = useCalendarWorkspace(calendarRef);

  return (
    <section className="h-[calc(100dvh-7.5rem)] min-h-[680px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
        <CalendarSidebar
          calendars={calendar.calendars}
          selectedCalendarIds={calendar.selectedCalendarIds}
          onToggleCalendar={calendar.toggleCalendar}
        />

        <div className="flex min-h-0 flex-col bg-slate-50/60">
          <CalendarToolbar
            calendarApi={calendar.calendarApi}
            title={calendar.title}
            activeView={calendar.activeView}
            onViewChange={calendar.handleViewChange}
            onCreateEvent={() => calendar.openCreateModal()}
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
          ) : calendar.isEmpty ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="max-w-md rounded-xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center">
                <h2 className="text-lg font-black text-[var(--color-primary-dark)]">
                  {intl.formatMessage({ id: "calendar.emptyTitle" })}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {intl.formatMessage({ id: "calendar.emptyDescription" })}
                </p>
              </div>
            </div>
          ) : (
            <CalendarGrid
              calendarRef={calendarRef}
              events={calendar.fullCalendarEvents}
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
        open={Boolean(calendar.draft || calendar.editingEvent)}
        calendars={calendar.calendars}
        initialDraft={calendar.draft}
        event={calendar.editingEvent}
        onClose={calendar.closeForm}
        onSubmit={calendar.handleSubmitEvent}
        submitting={calendar.formSubmitting}
      />

      <EventDetailModal
        open={Boolean(calendar.detailEvent)}
        event={calendar.detailEvent}
        onClose={calendar.closeDetail}
        onEdit={calendar.startEditingDetailEvent}
        onCancelEvent={calendar.handleCancelEvent}
        onRespond={calendar.handleRespond}
        busy={calendar.detailBusy}
      />
    </section>
  );
}
