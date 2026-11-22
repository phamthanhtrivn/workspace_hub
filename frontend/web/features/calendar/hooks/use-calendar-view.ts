"use client";

import { CalendarApi, DatesSetArg } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import { RefObject, useCallback, useState } from "react";
import { CALENDAR_INITIAL_VIEW } from "../types/calendar.constants";
import { createInitialCalendarRange } from "../utils/calendar-event.utils";
import { formatLocalDateKey } from "../utils/calendar-date.utils";
import { zonedDateKey } from "@/lib/timezone";

const calendarDay = (date = new Date()) => new Date(`${zonedDateKey(date)}T12:00:00`);

export function useCalendarView(calendarRef: RefObject<FullCalendar | null>) {
  const [calendarApi, setCalendarApi] = useState<CalendarApi | null>(null);
  const [range, setRange] = useState(createInitialCalendarRange);
  const [title, setTitle] = useState("");
  const [activeView, setActiveView] = useState(CALENDAR_INITIAL_VIEW);
  const [currentDate, setCurrentDate] = useState(calendarDay);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    calendarDay,
  );

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      setRange({
        startAt: arg.start.toISOString(),
        endAt: arg.end.toISOString(),
      });
      setTitle(arg.view.title);
      setActiveView(arg.view.type);
      setCurrentDate(calendarDay(arg.view.calendar.getDate()));
      setCalendarApi(calendarRef.current?.getApi() ?? null);
    },
    [calendarRef],
  );

  const handleViewChange = useCallback(
    (view: string) => {
      const api = calendarApi ?? calendarRef.current?.getApi();
      if (!api) return;

      api.changeView(view);
    },
    [calendarApi, calendarRef],
  );

  const handleCalendarNavigate = useCallback(
    (direction: "prev" | "next" | "today") => {
      const api = calendarApi ?? calendarRef.current?.getApi();
      if (!api) return;

      if (direction === "prev") api.prev();
      if (direction === "next") api.next();
      if (direction !== "today") return;

      const today = calendarDay();
      api.today();
      setSelectedDate(today);
      setCurrentDate(today);
    },
    [calendarApi, calendarRef],
  );

  const handleMiniCalendarDateSelect = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      const api = calendarApi ?? calendarRef.current?.getApi();
      api?.gotoDate(formatLocalDateKey(date));
      setCurrentDate(date);
    },
    [calendarApi, calendarRef],
  );

  return {
    activeView,
    currentDate,
    handleCalendarNavigate,
    handleDatesSet,
    handleMiniCalendarDateSelect,
    handleViewChange,
    range,
    selectedDate,
    title,
  };
}
