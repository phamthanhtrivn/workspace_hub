import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEvent, RecurrenceScope } from "../types/calendar.types";
import { createEventEndFromStart } from "../utils/calendar-event.utils";
import { CalendarEventMoveInfo } from "./calendar-workspace.types";
import { useUpdateCalendarEvent } from "./use-calendar-queries";

export function useCalendarEventMove(events: CalendarEvent[]) {
  const intl = useAppIntl();
  const updateEvent = useUpdateCalendarEvent();
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
        const end = info.event.end ?? createEventEndFromStart(info.event.start);
        await updateEvent.mutateAsync({
          eventId: info.event.id,
          payload: {
            startAt: info.event.start.toISOString(),
            endAt: end.toISOString(),
            allDay: info.event.allDay,
            recurrenceScope,
          },
        });
        toast.success(intl.formatMessage({ id: "calendar.eventMoved" }));
      } catch {
        info.revert();
        toast.error(intl.formatMessage({ id: "calendar.eventMoveFailed" }));
      }
    },
    [events, intl, updateEvent],
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
