"use client";

import {
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import luxonPlugin from "@fullcalendar/luxon3";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import type { DateClickArg } from "@fullcalendar/interaction";
import { Circle, CircleCheck } from "lucide-react";
import { memo, RefObject, useCallback, useEffect, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { readableTextOnColor } from "@/lib/color";

import {
  CALENDAR_INITIAL_VIEW,
  CALENDAR_SLOT_MAX_TIME,
  CALENDAR_SLOT_MIN_TIME,
} from "../../types/calendar.constants";
import { CalendarEventMoveInfo } from "../../hooks/calendar-workspace.types";
import { CalendarEvent, EventSourceType } from "../../types/calendar.types";
import { LoadingState } from "@/components/ui/loading-state";

const FULL_CALENDAR_PLUGINS = [
  dayGridPlugin,
  timeGridPlugin,
  interactionPlugin,
  listPlugin,
  luxonPlugin,
];

const renderMoreLinkText = (count: number) => `+${count} nữa`;

export const CalendarGrid = memo(function CalendarGrid({
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastSelectionEventRef = useRef<MouseEvent | null>(null);
  const handleSelect = useCallback(
    (selection: DateSelectArg) => {
      lastSelectionEventRef.current = selection.jsEvent;
      onSelect(selection);
    },
    [onSelect],
  );
  const handleDateClick = useCallback(
    (arg: DateClickArg) => {
      if (arg.jsEvent === lastSelectionEventRef.current) return;
      onDateClick(arg.date, arg.allDay);
    },
    [onDateClick],
  );
  const renderEventContent = useCallback(
    (arg: EventContentArg) => {
      const calendarColor = String(
        arg.event.extendedProps.calendarColor || "var(--primary)",
      );
      const eventColor = arg.event.backgroundColor || calendarColor;
      const hasCustomEventColor = Boolean(
        arg.event.extendedProps.hasCustomEventColor,
      );
      const isTask =
        arg.event.extendedProps.sourceType === EventSourceType.TASK ||
        Boolean(arg.event.extendedProps.projectTask);
      const isProjectTask = Boolean(arg.event.extendedProps.projectTask);
      const isCompletedTask =
        isTask && Boolean(arg.event.extendedProps.completedAt);
      const isDeclined = Boolean(arg.event.extendedProps.isDeclined);
      const taskEvent = arg.event.extendedProps.model as CalendarEvent | undefined;
      const canToggleTask =
        isTask && !isProjectTask && Boolean(taskEvent?.permissions?.canManage);
      const taskToggleLabel = isCompletedTask ? "Mark task incomplete" : "Mark task completed";




      const isMonthTimedEvent =
        arg.view.type === "dayGridMonth" && !arg.event.allDay && !isTask;

      if (isMonthTimedEvent) {
        return (
          <div
            title={`${arg.event.title}\n${arg.timeText}`}
            className="flex min-w-0 items-center gap-1.5 px-1 py-0.5 text-foreground"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor: isDeclined ? "var(--muted-foreground)" : eventColor,
              }}
            />
            <p
              className={`calendar-event-title min-w-0 text-xs leading-5 ${
                isDeclined ? "line-through text-muted-foreground" : ""
              }`}
            >
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
          title={`${arg.event.title}\n${arg.timeText}`}
          className={`calendar-event-content relative min-h-full min-w-0 overflow-hidden rounded px-1.5 py-1 text-primary-foreground ${
            isTask ? "calendar-task-event-content" : ""
          }`}
          style={{
            backgroundColor: isDeclined ? "var(--muted-foreground)" : eventColor,
            color: isDeclined ? "var(--background)" : readableTextOnColor(eventColor),
          }}
        >
          {hasCustomEventColor && !isTask && (
            <span
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: calendarColor }}
            />
          )}
          <div
            className={`min-w-0 ${
              hasCustomEventColor && !isTask ? "pl-1" : ""
            }`}
          >
            <p
              className={`calendar-event-title text-xs font-semibold leading-[1.25] ${
                isCompletedTask || isDeclined ? "line-through" : ""
              }`}
            >
              {canToggleTask ? (
                <Checkbox
                  checked={isCompletedTask}
                  aria-label={taskToggleLabel}
                  disabled={taskCompletionBusy}
                  title={taskToggleLabel}
                  data-task-completion-toggle
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onCheckedChange={() => {
                    if (taskEvent) onTaskCompletionToggle(taskEvent);
                  }}
                  className={`group/task-toggle relative mr-1 inline-grid h-4 w-4 place-items-center rounded-full align-text-bottom outline-none ring-border/90 focus-visible:ring-2 ${
                    taskCompletionBusy
                      ? "cursor-wait opacity-70"
                      : "cursor-pointer"
                  }`}
                />
              ) : isTask && isCompletedTask ? (
                <CircleCheck
                  aria-hidden="true"
                  className="calendar-event-status mr-1 inline-block h-3.5 w-3.5 align-text-bottom"
                />
              ) : isTask ? (
                <Circle
                  aria-hidden="true"
                  className="calendar-event-status mr-1 inline-block h-3.5 w-3.5 align-text-bottom"
                />
              ) : null}
              {arg.event.title}
            </p>
            {!arg.event.allDay && (
              <p
                className={`mt-0.5 whitespace-nowrap text-xs font-medium leading-[1.2] tabular-nums ${
                  isCompletedTask || isDeclined ? "line-through" : ""
                }`}
              >
                {arg.timeText}
              </p>
            )}
          </div>
        </div>
      );
    },
    [onTaskCompletionToggle, taskCompletionBusy],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => {
      calendarRef.current?.getApi().updateSize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [calendarRef]);

  return (
    <div
      ref={containerRef}
      className="calendar-shell relative min-h-0 min-w-0 flex-1 overflow-auto bg-card"
    >
      {loading && (
        <LoadingState label="Loading..." className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-info-content shadow-panel" />
      )}
      <FullCalendar
        ref={calendarRef}
        plugins={FULL_CALENDAR_PLUGINS}
        initialView={CALENDAR_INITIAL_VIEW}
        headerToolbar={false}
        locale="en"
        timeZone={timeZone}
        firstDay={1}
        height="100%"
        nowIndicator
        selectable
        selectMinDistance={5}
        selectMirror
        editable
        eventResizableFromStart
        dayMaxEvents={3}
        moreLinkText={renderMoreLinkText}
        moreLinkClick="popover"
        moreLinkDidMount={({ el }) => el.setAttribute("role", "button")}
        slotEventOverlap={false}
        views={{
          timeGrid: {
            displayEventEnd: false,
            eventTimeFormat: { hour: "numeric", minute: "2-digit", hour12: false },
          },
          timeGridWeek: { eventMaxStack: 2 },
        }}
        expandRows
        navLinks
        navLinkDayClick="timeGridDay"
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
        select={handleSelect}
        dateClick={handleDateClick}
        eventClick={onEventClick}
        eventDrop={onEventMove}
        eventResize={onEventMove}
        eventContent={renderEventContent}
      />
    </div>
  );
});
