"use client";

import {
  CalendarApi,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventInput,
} from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import { RefObject, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  useCalendarCalendars,
  useCalendarEvents,
  useCancelCalendarEvent,
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
  useUpdateCalendarEventResponse,
} from "./use-calendar-queries";
import { CALENDAR_INITIAL_VIEW } from "../types/calendar.constants";
import {
  AttendeeResponseStatus,
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFormValues,
  EventStatus,
} from "../types/calendar.types";
import {
  createDefaultEventDraft,
  createEventEndFromStart,
  createInitialCalendarRange,
  mapCalendarEventToFullCalendar,
} from "../utils/calendar-event.utils";

export interface CalendarEventMoveInfo {
  event: {
    id: string;
    start: Date | null;
    end: Date | null;
    allDay: boolean;
  };
  revert: () => void;
}

export function useCalendarWorkspace(
  calendarRef: RefObject<FullCalendar | null>,
) {
  const intl = useAppIntl();
  const [calendarApi, setCalendarApi] = useState<CalendarApi | null>(null);
  const [range, setRange] = useState(createInitialCalendarRange);
  const [title, setTitle] = useState("");
  const [activeView, setActiveView] = useState(CALENDAR_INITIAL_VIEW);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [draft, setDraft] = useState<CalendarEventDraft | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  const calendarsQuery = useCalendarCalendars();
  const calendars = calendarsQuery.data || [];
  const eventsQuery = useCalendarEvents(range);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const cancelEvent = useCancelCalendarEvent();
  const updateResponse = useUpdateCalendarEventResponse();

  const defaultCalendar =
    calendars.find((calendar) => calendar.isDefault) || calendars[0];

  useEffect(() => {
    if (calendars.length === 0) return;
    setSelectedCalendarIds((current) => {
      if (current.size > 0) return current;
      return new Set(
        calendars
          .filter((calendar) => calendar.isVisible)
          .map((calendar) => calendar.id),
      );
    });
  }, [calendars]);

  const fullCalendarEvents = useMemo<EventInput[]>(() => {
    const visibleIds = new Set(
      calendars
        .filter(
          (calendar) =>
            calendar.isVisible && selectedCalendarIds.has(calendar.id),
        )
        .map((calendar) => calendar.id),
    );

    return (eventsQuery.data || [])
      .filter((event) => event.status !== EventStatus.CANCELLED)
      .filter((event) => visibleIds.has(event.calendarId))
      .map(mapCalendarEventToFullCalendar);
  }, [calendars, eventsQuery.data, selectedCalendarIds]);

  const handleDatesSet = (arg: DatesSetArg) => {
    setRange({
      startAt: arg.start.toISOString(),
      endAt: arg.end.toISOString(),
    });
    setTitle(arg.view.title);
    setActiveView(arg.view.type);
    setCurrentDate(arg.view.calendar.getDate());
    setCalendarApi(calendarRef.current?.getApi() ?? null);
  };

  const openCreateModal = (nextDraft?: CalendarEventDraft) => {
    setEditingEvent(null);
    setDraft(nextDraft || createDefaultEventDraft(defaultCalendar?.id));
  };

  const handleSelect = (selection: DateSelectArg) => {
    openCreateModal({
      startAt: selection.start,
      endAt: selection.end,
      allDay: selection.allDay,
      calendarId: defaultCalendar?.id,
    });
    selection.view.calendar.unselect();
  };

  const handleDateClick = (date: Date, allDay: boolean) => {
    openCreateModal({
      startAt: date,
      endAt: createEventEndFromStart(date),
      allDay,
      calendarId: defaultCalendar?.id,
    });
  };

  const handleEventClick = (arg: EventClickArg) => {
    setDetailEvent(arg.event.extendedProps.model as CalendarEvent);
  };

  const handleSubmitEvent = async (values: CalendarEventFormValues) => {
    try {
      if (editingEvent) {
        const updated = await updateEvent.mutateAsync({
          eventId: editingEvent.id,
          payload: values,
        });
        setDetailEvent(updated);
        setEditingEvent(null);
      } else {
        await createEvent.mutateAsync(values);
        setDraft(null);
      }
      toast.success(intl.formatMessage({ id: "calendar.eventSaved" }));
    } catch (error) {
      toast.error(intl.formatMessage({ id: "calendar.eventSaveFailed" }));
    }
  };

  const handleEventMove = async (info: CalendarEventMoveInfo) => {
    if (!info.event.start) {
      info.revert();
      return;
    }

    try {
      const end = info.event.end || createEventEndFromStart(info.event.start);
      await updateEvent.mutateAsync({
        eventId: info.event.id,
        payload: {
          startAt: info.event.start.toISOString(),
          endAt: end.toISOString(),
          allDay: info.event.allDay,
        },
      });
      toast.success(intl.formatMessage({ id: "calendar.eventMoved" }));
    } catch (error) {
      info.revert();
      toast.error(intl.formatMessage({ id: "calendar.eventMoveFailed" }));
    }
  };

  const closeForm = () => {
    setDraft(null);
    setEditingEvent(null);
  };

  const closeDetail = () => {
    setDetailEvent(null);
  };

  const startEditingDetailEvent = () => {
    setEditingEvent(detailEvent);
    setDraft(null);
    setDetailEvent(null);
  };

  const toggleCalendar = (calendarId: string) => {
    setSelectedCalendarIds((current) => {
      const next = new Set(current);
      if (next.has(calendarId)) next.delete(calendarId);
      else next.add(calendarId);
      return next;
    });
  };

  const handleViewChange = (view: string) => {
    calendarApi?.changeView(view);
    setActiveView(view);
  };

  const handleCalendarNavigate = (direction: "prev" | "next" | "today") => {
    const api = calendarApi || calendarRef.current?.getApi();
    if (!api) return;

    if (direction === "prev") api.prev();
    if (direction === "next") api.next();
    if (direction === "today") {
      const today = new Date();
      api.today();
      setSelectedDate(today);
      setCurrentDate(today);
    }
  };

  const handleMiniCalendarDateSelect = (date: Date) => {
    setSelectedDate(date);
    const api = calendarApi || calendarRef.current?.getApi();
    api?.gotoDate(date);
    setCurrentDate(date);
  };

  const handleCancelEvent = async () => {
    if (!detailEvent) return;
    try {
      await cancelEvent.mutateAsync(detailEvent.id);
      setDetailEvent(null);
      toast.success(intl.formatMessage({ id: "calendar.eventCancelled" }));
    } catch (error) {
      toast.error(intl.formatMessage({ id: "calendar.eventCancelFailed" }));
    }
  };

  const handleRespond = async (responseStatus: AttendeeResponseStatus) => {
    if (!detailEvent) return;
    try {
      await updateResponse.mutateAsync({
        eventId: detailEvent.id,
        responseStatus,
      });
      toast.success(intl.formatMessage({ id: "calendar.responseSaved" }));
    } catch (error) {
      toast.error(intl.formatMessage({ id: "calendar.responseSaveFailed" }));
    }
  };

  return {
    activeView,
    calendarApi,
    calendars,
    closeDetail,
    closeForm,
    currentDate,
    detailBusy: cancelEvent.isPending || updateResponse.isPending,
    detailEvent,
    draft,
    editingEvent,
    formSubmitting: createEvent.isPending || updateEvent.isPending,
    fullCalendarEvents,
    handleCalendarNavigate,
    handleCancelEvent,
    handleDateClick,
    handleDatesSet,
    handleEventClick,
    handleEventMove,
    handleMiniCalendarDateSelect,
    handleRespond,
    handleSelect,
    handleSubmitEvent,
    handleViewChange,
    hasError: calendarsQuery.isError || eventsQuery.isError,
    isPreparingDefaultCalendar: calendars.length === 0 && calendarsQuery.isLoading,
    loading: calendarsQuery.isLoading || eventsQuery.isLoading,
    openCreateModal,
    selectedCalendarIds,
    selectedDate,
    startEditingDetailEvent,
    title,
    toggleCalendar,
  };
}
