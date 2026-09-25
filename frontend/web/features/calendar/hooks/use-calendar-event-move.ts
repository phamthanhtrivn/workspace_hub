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
        // FullCalendar all-day end is exclusive midnight; convert to inclusive 23:59:59 of the last day
        const end =
          info.event.allDay &&
          rawEnd.getHours() === 0 &&
          rawEnd.getMinutes() === 0
            ? (() => {
                const d = new Date(rawEnd.getTime() - 1);
                d.setHours(23, 59, 59, 999);
                return d;
              })()
            : rawEnd;
        await updateEventAsync({
          eventId: info.event.id,
          payload: {
            startAt: info.event.start.toISOString(),
            endAt: end.toISOString(),
            allDay: info.event.allDay,
            recurrenceScope,
          },
        });
        toast.success("Event updated");
      } catch {
        info.revert();
        toast.error("Failed to update event position");
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
        setPendingEventMove(info);
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
