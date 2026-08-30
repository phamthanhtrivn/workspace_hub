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
import {
  CALENDAR_DEFAULT_TASK_COLOR,
  CALENDAR_INITIAL_VIEW,
  CALENDAR_TASK_COLOR_STORAGE_KEY,
} from "../types/calendar.constants";
import {
  AttendeeResponseStatus,
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFormValues,
  EventStatus,
  EventSourceType,
  RecurrenceScope,
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
  const [selectedCalendarIds, setSelectedCalendarIds] =
    useState<Set<string> | null>(null);
  const [tasksVisible, setTasksVisible] = useState(true);
  const [tasksColor, setTasksColor] = useState(CALENDAR_DEFAULT_TASK_COLOR);
  const [draft, setDraft] = useState<CalendarEventDraft | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);
  const [pendingEventMove, setPendingEventMove] =
    useState<CalendarEventMoveInfo | null>(null);

  const calendarsQuery = useCalendarCalendars();
  const calendars = useMemo(
    () => calendarsQuery.data ?? [],
    [calendarsQuery.data],
  );
  const eventsQuery = useCalendarEvents(range);
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const cancelEvent = useCancelCalendarEvent();
  const updateResponse = useUpdateCalendarEventResponse();

  useEffect(() => {
    const storedColor = window.localStorage.getItem(
      CALENDAR_TASK_COLOR_STORAGE_KEY,
    );
    if (!/^#[0-9a-f]{6}$/i.test(storedColor || "")) return;

    const frameId = window.requestAnimationFrame(() => {
      setTasksColor(storedColor as string);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const changeTasksColor = (color: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return;
    setTasksColor(color);
    window.localStorage.setItem(CALENDAR_TASK_COLOR_STORAGE_KEY, color);
  };

  const defaultCalendar =
    calendars.find((calendar) => calendar.isDefault) || calendars[0];

  const effectiveSelectedCalendarIds = useMemo(
    () =>
      selectedCalendarIds ??
      new Set(
        calendars
          .filter((calendar) => calendar.isVisible)
          .map((calendar) => calendar.id),
      ),
    [calendars, selectedCalendarIds],
  );

  const fullCalendarEvents = useMemo<EventInput[]>(() => {
    const visibleIds = new Set(
      calendars
        .filter(
          (calendar) =>
            calendar.isVisible && effectiveSelectedCalendarIds.has(calendar.id),
        )
        .map((calendar) => calendar.id),
    );
    const calendarColors = new Map(
      calendars.map((calendar) => [calendar.id, calendar.color]),
    );

    return (eventsQuery.data || [])
      .filter((event) => event.status !== EventStatus.CANCELLED)
      .filter((event) =>
        event.sourceType === EventSourceType.TASK
          ? tasksVisible
          : visibleIds.has(event.calendarId),
      )
      .map((event) =>
        mapCalendarEventToFullCalendar(
          event,
          event.sourceType === EventSourceType.TASK
            ? tasksColor
            : calendarColors.get(event.calendarId),
        ),
      );
  }, [
    calendars,
    effectiveSelectedCalendarIds,
    eventsQuery.data,
    tasksColor,
    tasksVisible,
  ]);

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
    } catch {
      toast.error(intl.formatMessage({ id: "calendar.eventSaveFailed" }));
    }
  };

  const persistEventMove = async (
    info: CalendarEventMoveInfo,
    recurrenceScope: RecurrenceScope,
  ) => {
    if (!info.event.start) {
      info.revert();
      return;
    }

    const model = (eventsQuery.data || []).find(
      (event) => event.id === info.event.id,
    );
    if (!model?.permissions?.canManage) {
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
          recurrenceScope,
        },
      });
      toast.success(intl.formatMessage({ id: "calendar.eventMoved" }));
    } catch {
      info.revert();
      toast.error(intl.formatMessage({ id: "calendar.eventMoveFailed" }));
    }
  };

  const handleEventMove = (info: CalendarEventMoveInfo) => {
    const model = (eventsQuery.data || []).find(
      (event) => event.id === info.event.id,
    );

    if (!model?.permissions?.canManage) {
      info.revert();
      return;
    }

    if (model.recurrenceRule || model.recurrenceParentId) {
      setPendingEventMove(info);
      return;
    }

    void persistEventMove(info, RecurrenceScope.THIS);
  };

  const confirmEventMove = (scope: RecurrenceScope) => {
    if (!pendingEventMove) return;
    const info = pendingEventMove;
    setPendingEventMove(null);
    void persistEventMove(info, scope);
  };

  const cancelPendingEventMove = () => {
    pendingEventMove?.revert();
    setPendingEventMove(null);
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
      const next = new Set(current ?? effectiveSelectedCalendarIds);
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

  const handleCancelEvent = async (scope: RecurrenceScope) => {
    if (!detailEvent) return;
    try {
      await cancelEvent.mutateAsync({ eventId: detailEvent.id, scope });
      setDetailEvent(null);
      toast.success(intl.formatMessage({ id: "calendar.eventCancelled" }));
    } catch {
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
    } catch {
      toast.error(intl.formatMessage({ id: "calendar.responseSaveFailed" }));
    }
  };

  return {
    activeView,
    calendarApi,
    calendars,
    cancelPendingEventMove,
    closeDetail,
    closeForm,
    confirmEventMove,
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
    pendingEventMove,
    selectedCalendarIds: effectiveSelectedCalendarIds,
    selectedDate,
    startEditingDetailEvent,
    changeTasksColor,
    tasksColor,
    tasksVisible,
    title,
    toggleCalendar,
    toggleTasks: () => setTasksVisible((current) => !current),
  };
}
