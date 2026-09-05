"use client";

import FullCalendar from "@fullcalendar/react";
import { RefObject, useMemo } from "react";
import { useCalendarEventActions } from "./use-calendar-event-actions";
import {
  useCalendarCalendars,
  useCalendarEvents,
} from "./use-calendar-queries";
import { useCalendarView } from "./use-calendar-view";
import { useCalendarVisibility } from "./use-calendar-visibility";

export function useCalendarWorkspace(
  calendarRef: RefObject<FullCalendar | null>,
) {
  const view = useCalendarView(calendarRef);
  const calendarsQuery = useCalendarCalendars();
  const eventsQuery = useCalendarEvents(view.range);
  const calendars = useMemo(
    () => calendarsQuery.data ?? [],
    [calendarsQuery.data],
  );
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const defaultCalendar =
    calendars.find((calendar) => calendar.isDefault) ?? calendars[0];
  const visibility = useCalendarVisibility(calendars, events);
  const actions = useCalendarEventActions({
    defaultCalendarId: defaultCalendar?.id,
    events,
  });

  return {
    ...view,
    ...visibility,
    ...actions,
    calendars,
    displayTimeZone: defaultCalendar?.timeZone || "Asia/Ho_Chi_Minh",
    hasError: calendarsQuery.isError || eventsQuery.isError,
    isPreparingDefaultCalendar:
      calendars.length === 0 && calendarsQuery.isLoading,
    loading: calendarsQuery.isLoading || eventsQuery.isLoading,
  };
}
