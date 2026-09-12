import { EventClickArg } from "@fullcalendar/core";
import { useCallback } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  AttendeeResponseStatus,
  CalendarEvent,
  EventSourceType,
  EventStatus,
  RecurrenceScope,
} from "../types/calendar.types";
import {
  useCancelCalendarEvent,
  useUpdateCalendarEvent,
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
  const updateEvent = useUpdateCalendarEvent();
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
      const targetEvent = detailEvent;
      try {
        await cancelEvent.mutateAsync({ eventId: targetEvent.id, scope });
        setDetailEvent(null);
        toast.success(
          targetEvent.sourceType === EventSourceType.TASK
            ? intl.locale === "vi"
              ? `Đã xóa "${targetEvent.title}"`
              : `Deleted "${targetEvent.title}"`
            : intl.locale === "vi"
              ? `Đã xóa "${targetEvent.title}"`
              : `Deleted "${targetEvent.title}"`,
          {
            duration: 6000,
            action: {
              label: intl.locale === "vi" ? "Hoàn tác" : "Undo",
              onClick: async () => {
                try {
                  await updateEvent.mutateAsync({
                    eventId: targetEvent.id,
                    payload: { status: EventStatus.CONFIRMED },
                  });
                  toast.success(
                    intl.locale === "vi" ? "Đã hoàn tác" : "Restored",
                  );
                } catch {
                  toast.error(
                    intl.locale === "vi"
                      ? "Không thể hoàn tác"
                      : "Could not restore",
                  );
                }
              },
            },
          },
        );
      } catch {
        toast.error(intl.formatMessage({ id: "calendar.eventCancelFailed" }));
      }
    },
    [cancelEvent, detailEvent, intl, setDetailEvent, updateEvent],
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
