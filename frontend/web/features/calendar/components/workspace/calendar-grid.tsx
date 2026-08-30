"use client";

import {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { RefObject } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  CALENDAR_INITIAL_VIEW,
  CALENDAR_SLOT_MAX_TIME,
  CALENDAR_SLOT_MIN_TIME,
} from "../../types/calendar.constants";
import { CalendarEventMoveInfo } from "../../hooks/use-calendar-workspace";
import { EventSourceType } from "../../types/calendar.types";

export function CalendarGrid({
  calendarRef,
  events,
  loading,
  onDatesSet,
  onSelect,
  onDateClick,
  onEventClick,
  onEventMove,
}: {
  calendarRef: RefObject<FullCalendar | null>;
  events: EventInput[];
  loading: boolean;
  onDatesSet: (arg: DatesSetArg) => void;
  onSelect: (selection: DateSelectArg) => void;
  onDateClick: (date: Date, allDay: boolean) => void;
  onEventClick: (arg: EventClickArg) => void;
  onEventMove: (info: CalendarEventMoveInfo) => void;
}) {
  const intl = useAppIntl();

  return (
    <div className="calendar-shell relative min-h-0 flex-1 bg-white">
      {loading && (
        <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-blue-100 bg-white/95 px-4 py-2 text-xs font-semibold text-blue-700 shadow-sm">
          {intl.formatMessage({ id: "app.loading" })}
        </div>
      )}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={CALENDAR_INITIAL_VIEW}
        headerToolbar={false}
        locale={intl.locale}
        firstDay={0}
        height="100%"
        nowIndicator
        selectable
        selectMirror
        editable
        eventResizableFromStart
        dayMaxEvents
        expandRows
        navLinks
        slotDuration="00:30:00"
        snapDuration="00:15:00"
        scrollTime="08:00:00"
        selectLongPressDelay={250}
        slotMinTime={CALENDAR_SLOT_MIN_TIME}
        slotMaxTime={CALENDAR_SLOT_MAX_TIME}
        allDayMaintainDuration
        events={events}
        datesSet={onDatesSet}
        select={onSelect}
        dateClick={(arg) => onDateClick(arg.date, arg.allDay)}
        eventClick={onEventClick}
        eventDrop={onEventMove}
        eventResize={onEventMove}
        eventContent={(arg) => {
          const calendarColor = String(
            arg.event.extendedProps.calendarColor || "#2563eb",
          );
          const hasCustomEventColor = Boolean(
            arg.event.extendedProps.hasCustomEventColor,
          );
          const isTask =
            arg.event.extendedProps.sourceType === EventSourceType.TASK;

          return (
            <div
              className={`relative min-h-full min-w-0 overflow-hidden rounded px-1.5 py-1 text-white ${
                isTask ? "calendar-task-event-content" : ""
              }`}
              title={`${arg.event.title}${arg.timeText ? `, ${arg.timeText}` : ""}`}
            >
              {hasCustomEventColor && !isTask && (
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: calendarColor }}
                />
              )}
              <div className={hasCustomEventColor && !isTask ? "pl-1" : ""}>
                <p className="truncate text-xs font-semibold leading-[1.25]">
                  {arg.event.title}
                </p>
                {!arg.event.allDay && (
                  <p className="mt-0.5 truncate text-[11px] font-medium leading-[1.2] opacity-95 tabular-nums">
                    {arg.timeText}
                  </p>
                )}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
