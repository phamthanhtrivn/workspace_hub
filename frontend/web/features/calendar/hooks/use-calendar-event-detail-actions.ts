import { EventClickArg } from "@fullcalendar/core";
import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";

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
  useUpdateCalendarTaskCompletion,
} from "./use-calendar-queries";
import { isTaskCalendarEvent } from "../utils/calendar-event.utils";
import { useAppSelector } from "@/store/store";

interface UseCalendarEventDetailActionsInput {
  detailEvent: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  setDetailEvent: Dispatch<SetStateAction<CalendarEvent | null>>;
}

export function useCalendarEventDetailActions({
  detailEvent,
  onEdit,
  setDetailEvent,
}: UseCalendarEventDetailActionsInput) {

  const currentUserId = useAppSelector((state) => state.auth.userId);
  const cancelEvent = useCancelCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const updateResponse = useUpdateCalendarEventResponse();
  const {
    mutateAsync: updateTaskCompletionAsync,
    isPending: taskCompletionPending,
  } = useUpdateCalendarTaskCompletion();

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const target = arg.jsEvent.target;
      if (
        target instanceof Element &&
        target.closest("[data-task-completion-toggle]")
      ) {
        return;
      }
      setDetailEvent(arg.event.extendedProps.model as CalendarEvent);
    },
    [setDetailEvent],
  );

  const openDetail = useCallback(
    (event: CalendarEvent) => setDetailEvent(event),
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
          `Deleted "${targetEvent.title}"`,






          {
            duration: 6000,
            action: {
              label: "Undo",
              onClick: async () => {
                try {
                  await updateEvent.mutateAsync({
                    eventId: targetEvent.id,
                    payload: { status: EventStatus.CONFIRMED },
                  });
                  toast.success(
                    "Restored",
                  );
                } catch {
                  toast.error(
                    "Could not restore",


                  );
                }
              },
            },
          },
        );
      } catch {
        toast.error("Failed to delete event");
      }
    },
    [cancelEvent, detailEvent, setDetailEvent, updateEvent],
  );

  const handleRespond = useCallback(
    async (responseStatus: AttendeeResponseStatus) => {
      if (!detailEvent) return;
      setDetailEvent({
        ...detailEvent,
        attendees: detailEvent.attendees?.map((a) =>
          a.userId === currentUserId || (!currentUserId && a.userId !== detailEvent.createdBy)
            ? { ...a, responseStatus }
            : a,
        ),
      });
      try {
        await updateResponse.mutateAsync({
          eventId: detailEvent.id,
          responseStatus,
        });
        toast.success("Response saved");
      } catch {
        toast.error("Failed to save response");
      }
    },
    [currentUserId, detailEvent, setDetailEvent, updateResponse],
  );

  const updateTaskCompletionForEvent = useCallback(
    async (event: CalendarEvent) => {
      if (!isTaskCalendarEvent(event) || taskCompletionPending) {
        return;
      }

      const completed = !event.completedAt;
      try {
        const updatedEvent = await updateTaskCompletionAsync({
          eventId: event.id,
          completed,
        });
        setDetailEvent((current) =>
          current?.id === updatedEvent.id ? updatedEvent : current,
        );
        toast.success(
          completed ? "Task marked as completed" : "Task marked as incomplete",
        );






      } catch {
        toast.error("Failed to update task status");


      }
    },
    [
      setDetailEvent,
      taskCompletionPending,
      updateTaskCompletionAsync,
    ],
  );

  const handleTaskCompletionChange = useCallback(async () => {
    if (!detailEvent) return;
    await updateTaskCompletionForEvent(detailEvent);
  }, [detailEvent, updateTaskCompletionForEvent]);

  return {
    closeDetail,
    detailBusy:
      cancelEvent.isPending ||
      updateResponse.isPending ||
      taskCompletionPending,
    handleCancelEvent,
    handleEventClick,
    handleRespond,
    handleTaskCompletionChange,
    handleTaskCompletionQuickToggle: updateTaskCompletionForEvent,
    openDetail,
    startEditingDetailEvent,
    taskCompletionBusy: taskCompletionPending,
  };
}
