import { useMemo, useState } from "react";
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
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  const activeDetailEvent = useMemo(() => {
    if (!detailEvent) return null;
    const fromList = events.find((e) => e.id === detailEvent.id);
    if (!fromList && events.length > 0) return null;
    if (!fromList) return detailEvent;
    const detailTime = new Date(detailEvent.updatedAt || 0).getTime();
    const listTime = new Date(fromList.updatedAt || 0).getTime();
    return detailTime >= listTime ? detailEvent : fromList;
  }, [detailEvent, events]);

  const editor = useCalendarEventEditorActions({
    defaultCalendarId,
    onEventUpdated: setDetailEvent,
  });
  const detail = useCalendarEventDetailActions({
    detailEvent: activeDetailEvent,
    onEdit: editor.openEditForm,
    setDetailEvent,
  });
  const move = useCalendarEventMove(events);

  return {
    ...editor,
    ...detail,
    ...move,
    detailEvent: activeDetailEvent,
  };
}
