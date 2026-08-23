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
    <div className="calendar-shell min-h-0 flex-1 p-3">
      {loading && (
        <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
          {intl.formatMessage({ id: "app.loading" })}
        </div>
      )}
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView={CALENDAR_INITIAL_VIEW}
        headerToolbar={false}
        firstDay={1}
        height="100%"
        nowIndicator
        selectable
        selectMirror
        editable
        eventResizableFromStart
        dayMaxEvents
        expandRows
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

          return (
            <div className="relative min-h-full min-w-0 overflow-hidden rounded-md px-2 py-1">
              {hasCustomEventColor && (
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: calendarColor }}
                />
              )}
              <div className={hasCustomEventColor ? "pl-1" : ""}>
                <p className="truncate text-[11px] font-black">
                  {arg.event.title}
                </p>
                {!arg.event.allDay && (
                  <p className="truncate text-[10px] font-semibold opacity-90">
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
