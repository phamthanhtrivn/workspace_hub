import { useCallback, useState } from "react";
import { CalendarEvent } from "../types/calendar.types";
import { useCalendarEventDetailActions } from "./use-calendar-event-detail-actions";
import { useCalendarEventEditorActions } from "./use-calendar-event-editor-actions";
import { useCalendarEventMove } from "./use-calendar-event-move";

interface UseCalendarEventActionsInput {
  defaultCalendarId?: string;
  events: CalendarEvent[];
}

export function useCalendarEventActions({
  defaultCalendarId,
  events,
}: UseCalendarEventActionsInput) {
  const [detailEvent, setDetailEventState] = useState<CalendarEvent | null>(null);
  const setDetailEvent = useCallback((event: CalendarEvent | null) => {
    setDetailEventState(event);
  }, []);
  const editor = useCalendarEventEditorActions({
    defaultCalendarId,
    onEventUpdated: setDetailEvent,
  });
  const detail = useCalendarEventDetailActions({
    detailEvent,
    onEdit: editor.openEditForm,
    setDetailEvent,
  });
  const move = useCalendarEventMove(events);

  return {
    ...editor,
    ...detail,
    ...move,
    detailEvent,
  };
}
