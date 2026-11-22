"use client";

import { getActionErrorMessage } from "@/lib/permission-feedback";
import { fromZonedDateTimeInput, getDisplayTimezone, zonedDateKey } from "@/lib/timezone";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CalendarEvent, RecurrenceScope } from "../types/calendar.types";
import { createEventEndFromStart } from "../utils/calendar-event.utils";
import { CalendarEventMoveInfo } from "./calendar-workspace.types";
import { useUpdateCalendarEvent } from "./use-calendar-queries";

export function useCalendarEventMove(events: CalendarEvent[]) {

  const { mutateAsync: updateEventAsync } = useUpdateCalendarEvent();
  const [pendingEventMove, setPendingEventMove] =
    useState<CalendarEventMoveInfo | null>(null);

  const persistEventMove = useCallback(
    async (info: CalendarEventMoveInfo, recurrenceScope: RecurrenceScope) => {
      if (!info.event.start) {
        info.revert();
        return;
      }
      const model = events.find((event) => event.id === info.event.id);
      if (!model?.permissions?.canManage) {
        info.revert();
        return;
      }

      try {
        const rawEnd = info.event.end ?? createEventEndFromStart(info.event.start);
        const storageZone = model.timeZone || model.calendar?.timeZone || getDisplayTimezone();
        // All-day values retain their calendar dates, including when moved by a viewer in another zone.
        const startAt = info.event.allDay
          ? fromZonedDateTimeInput(`${zonedDateKey(info.event.start)}T00:00`, storageZone)
          : info.event.start.toISOString();
        const endAt = info.event.allDay
          ? fromZonedDateTimeInput(`${zonedDateKey(new Date(rawEnd.getTime() - 1))}T23:59:59.999`, storageZone)
          : rawEnd.toISOString();

        await updateEventAsync({
          eventId: info.event.id,
          payload: {
            startAt,
            endAt,
            allDay: info.event.allDay,
            recurrenceScope,

          },
        });
        toast.success("Event updated");
      } catch (permissionError) {
        info.revert();
        toast.error(getActionErrorMessage(permissionError, "Failed to update event position"));
      }
    },
    [events, updateEventAsync],
  );

  const handleEventMove = useCallback(
    (info: CalendarEventMoveInfo) => {
      const model = events.find((event) => event.id === info.event.id);
      if (!model?.permissions?.canManage) {
        info.revert();
        return;
      }
      if (model.recurrenceRule || model.recurrenceParentId) {
        info.revert();
        return;
      }
      void persistEventMove(info, RecurrenceScope.THIS);
    },
    [events, persistEventMove],
  );

  const confirmEventMove = useCallback(
    (scope: RecurrenceScope) => {
      if (!pendingEventMove) return;
      const move = pendingEventMove;
      setPendingEventMove(null);
      void persistEventMove(move, scope);
    },
    [pendingEventMove, persistEventMove],
  );

  const cancelPendingEventMove = useCallback(() => {
    pendingEventMove?.revert();
    setPendingEventMove(null);
  }, [pendingEventMove]);

  return {
    cancelPendingEventMove,
    confirmEventMove,
    handleEventMove,
    pendingEventMove,
  };
}
