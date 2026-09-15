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
import luxonPlugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Circle, CircleCheck } from "lucide-react";
import { RefObject } from "react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  CALENDAR_INITIAL_VIEW,
  CALENDAR_SLOT_MAX_TIME,
  CALENDAR_SLOT_MIN_TIME,
} from "../../types/calendar.constants";
import { CalendarEventMoveInfo } from "../../hooks/calendar-workspace.types";
import { CalendarEvent, EventSourceType } from "../../types/calendar.types";

export function CalendarGrid({
  calendarRef,
  events,
  timeZone,
  loading,
  onDatesSet,
  onSelect,
  onDateClick,
  onEventClick,
  onEventMove,
  onTaskCompletionToggle,
  taskCompletionBusy,
}: {
  calendarRef: RefObject<FullCalendar | null>;
  events: EventInput[];
  timeZone: string;
  loading: boolean;
  onDatesSet: (arg: DatesSetArg) => void;
  onSelect: (selection: DateSelectArg) => void;
  onDateClick: (date: Date, allDay: boolean) => void;
  onEventClick: (arg: EventClickArg) => void;
  onEventMove: (info: CalendarEventMoveInfo) => void;
  onTaskCompletionToggle: (event: CalendarEvent) => void;
  taskCompletionBusy: boolean;
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
        plugins={[
          dayGridPlugin,
          timeGridPlugin,
          interactionPlugin,
          listPlugin,
          luxonPlugin,
        ]}
        initialView={CALENDAR_INITIAL_VIEW}
        headerToolbar={false}
        locale={intl.locale}
        timeZone={timeZone}
        firstDay={1}
        height="100%"
        nowIndicator
        selectable
        selectMirror
        editable
        eventResizableFromStart
        dayMaxEvents={3}
        moreLinkText={() => intl.formatMessage({ id: "calendar.moreEvents" })}
        expandRows
        navLinks
        slotDuration="00:30:00"
        snapDuration="00:15:00"
        defaultTimedEventDuration="01:00:00"
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
          const eventColor = arg.event.backgroundColor || calendarColor;
          const hasCustomEventColor = Boolean(
            arg.event.extendedProps.hasCustomEventColor,
          );
          const isTask =
            arg.event.extendedProps.sourceType === EventSourceType.TASK;
          const isCompletedTask =
            isTask && Boolean(arg.event.extendedProps.completedAt);
          const taskEvent = arg.event.extendedProps.model as CalendarEvent;
          const canToggleTask =
            isTask && Boolean(taskEvent.permissions?.canManage);
          const taskToggleLabel = intl.formatMessage({
            id: isCompletedTask
              ? "calendar.task.markIncomplete"
              : "calendar.task.markCompleted",
          });
          const isMonthTimedEvent =
            arg.view.type === "dayGridMonth" && !arg.event.allDay && !isTask;

          if (isMonthTimedEvent) {
            return (
              <div
                className="flex min-w-0 items-center gap-1.5 px-1 py-0.5 text-slate-800"
                title={`${arg.event.title}${arg.timeText ? `, ${arg.timeText}` : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: eventColor }}
                />
                <p className="min-w-0 truncate text-xs leading-5">
                  {arg.timeText && (
                    <span className="tabular-nums">{arg.timeText} </span>
                  )}
                  <span className="font-semibold">{arg.event.title}</span>
                </p>
              </div>
            );
          }

          return (
            <div
              className={`relative min-h-full min-w-0 overflow-hidden rounded px-1.5 py-1 text-white ${
                isTask ? "calendar-task-event-content" : ""
              }`}
              style={{ backgroundColor: eventColor }}
              title={`${arg.event.title}${arg.timeText ? `, ${arg.timeText}` : ""}`}
            >
              {hasCustomEventColor && !isTask && (
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{ backgroundColor: calendarColor }}
                />
              )}
              <div
                className={`flex min-w-0 items-start gap-1 ${
                  hasCustomEventColor && !isTask ? "pl-1" : ""
                }`}
              >
                {canToggleTask ? (
                  <span
                    role="checkbox"
                    aria-checked={isCompletedTask}
                    aria-label={taskToggleLabel}
                    aria-disabled={taskCompletionBusy}
                    title={taskToggleLabel}
                    tabIndex={taskCompletionBusy ? -1 : 0}
                    data-task-completion-toggle
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!taskCompletionBusy) {
                        onTaskCompletionToggle(taskEvent);
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      event.stopPropagation();
                      if (!taskCompletionBusy) {
                        onTaskCompletionToggle(taskEvent);
                      }
                    }}
                    className={`group/task-toggle relative mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full outline-none ring-white/90 focus-visible:ring-2 ${
                      taskCompletionBusy
                        ? "cursor-wait opacity-70"
                        : "cursor-pointer"
                    }`}
                  >
                    {isCompletedTask ? (
                      <CircleCheck className="h-3.5 w-3.5" />
                    ) : (
                      <>
                        <Circle className="h-3.5 w-3.5 transition-opacity group-hover/task-toggle:opacity-0 group-focus-visible/task-toggle:opacity-0" />
                        <CircleCheck className="absolute h-3.5 w-3.5 opacity-0 transition-opacity group-hover/task-toggle:opacity-100 group-focus-visible/task-toggle:opacity-100" />
                      </>
                    )}
                  </span>
                ) : isTask && isCompletedTask ? (
                  <CircleCheck className="mt-px h-3.5 w-3.5 shrink-0" />
                ) : isTask ? (
                  <Circle className="mt-px h-3.5 w-3.5 shrink-0" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-xs font-semibold leading-[1.25] ${
                      isCompletedTask ? "line-through" : ""
                    }`}
                  >
                    {arg.event.title}
                  </p>
                  {!arg.event.allDay && (
                    <p
                      className={`mt-0.5 truncate text-[11px] font-medium leading-[1.2] opacity-95 tabular-nums ${
                        isCompletedTask ? "line-through" : ""
                      }`}
                    >
                      {arg.timeText}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
