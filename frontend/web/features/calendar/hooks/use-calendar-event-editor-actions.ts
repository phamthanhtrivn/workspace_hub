import { DateSelectArg } from "@fullcalendar/core";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
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
  const intl = useAppIntl();
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
      openCreateModal({
        startAt: selection.start,
        endAt: selection.end,
        allDay: selection.allDay,
        calendarId: defaultCalendarId,
      });
      selection.view.calendar.unselect();
    },
    [defaultCalendarId, openCreateModal],
  );

  const handleDateClick = useCallback(
    (date: Date, allDay: boolean) => {
      openCreateModal({
        startAt: date,
        endAt: createEventEndFromStart(date),
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
        toast.success(intl.formatMessage({ id: "calendar.eventSaved" }));
      } catch {
        toast.error(intl.formatMessage({ id: "calendar.eventSaveFailed" }));
      }
    },
    [createEvent, editingEvent, intl, onEventUpdated, updateEvent],
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
