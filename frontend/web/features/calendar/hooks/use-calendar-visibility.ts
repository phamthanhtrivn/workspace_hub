import { EventInput } from "@fullcalendar/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CALENDAR_DEFAULT_TASK_COLOR,
  CALENDAR_SHOW_COMPLETED_STORAGE_KEY,
  CALENDAR_TASK_COLOR_STORAGE_KEY,
} from "../types/calendar.constants";
import {
  CalendarEvent,
  EventStatus,
  WorkspaceCalendar,
} from "../types/calendar.types";
import {
  isTaskCalendarEvent,
  mapCalendarEventToFullCalendar,
} from "../utils/calendar-event.utils";
import { useAppSelector } from "@/store/store";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

export function useCalendarVisibility(
  calendars: WorkspaceCalendar[],
  events: CalendarEvent[],
) {
  const currentUserId = useAppSelector((state) => state.auth.userId);
  const [selectedCalendarIds, setSelectedCalendarIds] =
    useState<Set<string> | null>(null);
  const [tasksVisible, setTasksVisible] = useState(true);
  const [tasksColor, setTasksColor] = useState(CALENDAR_DEFAULT_TASK_COLOR);
  const [showCompletedTasks, setShowCompletedTasks] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem(
        CALENDAR_SHOW_COMPLETED_STORAGE_KEY,
      );
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    let storedColor: string | null = null;
    try {
      storedColor = window.localStorage.getItem(
        CALENDAR_TASK_COLOR_STORAGE_KEY,
      );
    } catch {
      return;
    }
    if (!HEX_COLOR_PATTERN.test(storedColor || "")) return;

    const frameId = window.requestAnimationFrame(() => {
      setTasksColor(storedColor as string);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const effectiveSelectedCalendarIds = useMemo(
    () =>
      selectedCalendarIds ??
      new Set(
        calendars
          .filter((calendar) => calendar.isVisible)
          .map((calendar) => calendar.id),
      ),
    [calendars, selectedCalendarIds],
  );

  const fullCalendarEvents = useMemo<EventInput[]>(() => {
    const visibleIds = new Set(
      calendars
        .filter(
          (calendar) =>
            calendar.isVisible &&
            effectiveSelectedCalendarIds.has(calendar.id),
        )
        .map((calendar) => calendar.id),
    );
    const calendarColors = new Map(
      calendars.map((calendar) => [calendar.id, calendar.color]),
    );
    const userCalendarIds = new Set(calendars.map((calendar) => calendar.id));
    const defaultCalendar =
      calendars.find((c) => !c.projectId && c.isDefault) ??
      calendars.find((c) => !c.projectId) ??
      calendars[0];
    const isDefaultCalendarVisible = defaultCalendar
      ? visibleIds.has(defaultCalendar.id)
      : visibleIds.size > 0;

    return events
      .filter((event) => event.status !== EventStatus.CANCELLED)
      .filter((event) => {
        if (isTaskCalendarEvent(event)) {
          if (!tasksVisible) return false;
          if (!showCompletedTasks && event.completedAt) return false;
          return true;
        }

        // If the event belongs to one of user's own calendars
        if (userCalendarIds.has(event.calendarId)) {
          return visibleIds.has(event.calendarId);
        }

        // Invited / external event (created by another user on their calendar)
        // Display it as long as the user's default / personal calendar is active
        return isDefaultCalendarVisible;
      })
      .map((event) =>
        mapCalendarEventToFullCalendar(
          event,
          isTaskCalendarEvent(event)
            ? tasksColor
            : calendarColors.get(event.calendarId) ||
              event.color ||
              event.calendar?.color ||
              defaultCalendar?.color,
          currentUserId,
        ),
      );
  }, [
    calendars,
    currentUserId,
    effectiveSelectedCalendarIds,
    events,
    showCompletedTasks,
    tasksColor,
    tasksVisible,
  ]);

  const changeTasksColor = useCallback((color: string) => {
    if (!HEX_COLOR_PATTERN.test(color)) return;
    setTasksColor(color);
    try {
      window.localStorage.setItem(CALENDAR_TASK_COLOR_STORAGE_KEY, color);
    } catch {
      // The visual preference remains active for this session.
    }
  }, []);

  const toggleCalendar = useCallback(
    (calendarId: string) => {
      setSelectedCalendarIds((current) => {
        const next = new Set(current ?? effectiveSelectedCalendarIds);
        if (next.has(calendarId)) next.delete(calendarId);
        else next.add(calendarId);
        return next;
      });
    },
    [effectiveSelectedCalendarIds],
  );

  const toggleTasks = useCallback(() => {
    setTasksVisible((current) => !current);
  }, []);

  const toggleShowCompletedTasks = useCallback(() => {
    setShowCompletedTasks((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(
          CALENDAR_SHOW_COMPLETED_STORAGE_KEY,
          String(next),
        );
      } catch {
        // The visual preference remains active for this session.
      }
      return next;
    });
  }, []);

  return {
    changeTasksColor,
    fullCalendarEvents,
    selectedCalendarIds: effectiveSelectedCalendarIds,
    showCompletedTasks,
    tasksColor,
    tasksVisible,
    toggleCalendar,
    toggleShowCompletedTasks,
    toggleTasks,
  };
}
