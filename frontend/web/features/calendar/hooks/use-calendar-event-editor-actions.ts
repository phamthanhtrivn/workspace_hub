import { DateSelectArg } from "@fullcalendar/core";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CALENDAR_FORM_COPY as copy } from "../constants/calendar-form-copy";
import {
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFormValues,
} from "../types/calendar.types";
import {
  createDefaultEventDraft,
  createEventEndFromStart,
} from "../utils/calendar-event.utils";
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
} from "./use-calendar-queries";

interface UseCalendarEventEditorActionsInput {
  defaultCalendarId?: string;
  onEventUpdated: (event: CalendarEvent) => void;
}

export function useCalendarEventEditorActions({
  defaultCalendarId,
  onEventUpdated,
}: UseCalendarEventEditorActionsInput) {
  const [draft, setDraft] = useState<CalendarEventDraft | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();

  const openCreateModal = useCallback(
    (nextDraft?: CalendarEventDraft) => {
      setEditingEvent(null);
      setDraft(nextDraft ?? createDefaultEventDraft(defaultCalendarId));
    },
    [defaultCalendarId],
  );

  const handleSelect = useCallback(
    (selection: DateSelectArg) => {
      const isSingleClickSelection =
        !selection.allDay &&
        selection.end.getTime() - selection.start.getTime() <= 15 * 60 * 1000;

      let endAt: Date;
      if (selection.allDay) {
        const lastSelectedDay = new Date(selection.end.getTime() - 1);
        lastSelectedDay.setHours(23, 59, 59, 999);
        endAt = lastSelectedDay;
      } else if (isSingleClickSelection) {
        endAt = createEventEndFromStart(selection.start);
      } else {
        endAt = selection.end;
      }

      selection.view.calendar.unselect();
      openCreateModal({
        startAt: selection.start,
        endAt,
        allDay: selection.allDay,
        calendarId: defaultCalendarId,
      });
    },
    [defaultCalendarId, openCreateModal],
  );

  const handleDateClick = useCallback(
    (date: Date, allDay: boolean) => {
      let endAt: Date;
      if (allDay) {
        endAt = new Date(date);
        endAt.setHours(23, 59, 59, 999);
      } else {
        endAt = createEventEndFromStart(date);
      }

      openCreateModal({
        startAt: date,
        endAt,
        allDay,
        calendarId: defaultCalendarId,
      });
    },
    [defaultCalendarId, openCreateModal],
  );

  const handleSubmitEvent = useCallback(
    async (values: CalendarEventFormValues) => {
      try {
        if (editingEvent) {
          const updated = await updateEvent.mutateAsync({
            eventId: editingEvent.id,
            payload: values,
          });
          onEventUpdated(updated);
          setEditingEvent(null);
        } else {
          await createEvent.mutateAsync(values);
          setDraft(null);
        }
        toast.success(copy.eventSaved);
      } catch {
        toast.error(copy.eventSaveFailed);
      }
    },
    [createEvent, editingEvent, onEventUpdated, updateEvent],
  );

  const closeForm = useCallback(() => {
    setDraft(null);
    setEditingEvent(null);
  }, []);

  const openEditForm = useCallback((event: CalendarEvent) => {
    setEditingEvent(event);
    setDraft(null);
  }, []);

  return {
    closeForm,
    draft,
    editingEvent,
    formSubmitting: createEvent.isPending || updateEvent.isPending,
    handleDateClick,
    handleSelect,
    handleSubmitEvent,
    openCreateModal,
    openEditForm,
  };
}
