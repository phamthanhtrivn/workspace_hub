import { EventClickArg } from "@fullcalendar/core";
import { useCallback } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  AttendeeResponseStatus,
  CalendarEvent,
  RecurrenceScope,
} from "../types/calendar.types";
import {
  useCancelCalendarEvent,
  useUpdateCalendarEventResponse,
} from "./use-calendar-queries";

interface UseCalendarEventDetailActionsInput {
  detailEvent: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  setDetailEvent: (event: CalendarEvent | null) => void;
}

export function useCalendarEventDetailActions({
  detailEvent,
  onEdit,
  setDetailEvent,
}: UseCalendarEventDetailActionsInput) {
  const intl = useAppIntl();
  const cancelEvent = useCancelCalendarEvent();
  const updateResponse = useUpdateCalendarEventResponse();

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      setDetailEvent(arg.event.extendedProps.model as CalendarEvent);
    },
    [setDetailEvent],
  );

  const closeDetail = useCallback(() => setDetailEvent(null), [setDetailEvent]);

  const startEditingDetailEvent = useCallback(() => {
    if (!detailEvent) return;
    onEdit(detailEvent);
    setDetailEvent(null);
  }, [detailEvent, onEdit, setDetailEvent]);

  const handleCancelEvent = useCallback(
    async (scope: RecurrenceScope) => {
      if (!detailEvent) return;
      try {
        await cancelEvent.mutateAsync({ eventId: detailEvent.id, scope });
        setDetailEvent(null);
        toast.success(intl.formatMessage({ id: "calendar.eventCancelled" }));
      } catch {
        toast.error(intl.formatMessage({ id: "calendar.eventCancelFailed" }));
      }
    },
    [cancelEvent, detailEvent, intl, setDetailEvent],
  );

  const handleRespond = useCallback(
    async (responseStatus: AttendeeResponseStatus) => {
      if (!detailEvent) return;
      try {
        await updateResponse.mutateAsync({
          eventId: detailEvent.id,
          responseStatus,
        });
        toast.success(intl.formatMessage({ id: "calendar.responseSaved" }));
      } catch {
        toast.error(intl.formatMessage({ id: "calendar.responseSaveFailed" }));
      }
    },
    [detailEvent, intl, updateResponse],
  );

  return {
    closeDetail,
    detailBusy: cancelEvent.isPending || updateResponse.isPending,
    handleCancelEvent,
    handleEventClick,
    handleRespond,
    startEditingDetailEvent,
  };
}
