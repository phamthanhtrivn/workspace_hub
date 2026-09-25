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

const CALENDAR_SCROLLER_SELECTOR = ".calendar-shell .fc-scroller";

function captureCalendarScroll() {
  if (typeof document === "undefined") return () => {};

  const snapshots = Array.from(
    document.querySelectorAll<HTMLElement>(CALENDAR_SCROLLER_SELECTOR),
  ).map((element, index) => ({
    element,
    index,
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop,
  }));

  return () => {
    const currentScrollers = Array.from(
      document.querySelectorAll<HTMLElement>(CALENDAR_SCROLLER_SELECTOR),
    );

    for (const snapshot of snapshots) {
      const target = snapshot.element.isConnected
        ? snapshot.element
        : currentScrollers[snapshot.index];
      if (!target) continue;

      target.scrollLeft = snapshot.scrollLeft;
      target.scrollTop = snapshot.scrollTop;
    }
  };
}

function restoreCalendarScrollAfterRender(restore: () => void) {
  if (typeof window === "undefined") return;

  let frame = 0;
  const restoreForSeveralFrames = () => {
    restore();
    frame += 1;
    if (frame < 12) {
      window.requestAnimationFrame(restoreForSeveralFrames);
    }
  };

  window.requestAnimationFrame(restoreForSeveralFrames);
  window.setTimeout(restore, 150);
  window.setTimeout(restore, 350);
  window.setTimeout(restore, 700);
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
      const restoreScroll = captureCalendarScroll();
      setEditingEvent(null);
      setDraft(nextDraft ?? createDefaultEventDraft(defaultCalendarId));
      restoreCalendarScrollAfterRender(restoreScroll);
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

      openCreateModal({
        startAt: selection.start,
        endAt,
        allDay: selection.allDay,
        calendarId: defaultCalendarId,
      });
      selection.view.calendar.unselect();
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
    const restoreScroll = captureCalendarScroll();
    setEditingEvent(event);
    setDraft(null);
    restoreCalendarScrollAfterRender(restoreScroll);
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
