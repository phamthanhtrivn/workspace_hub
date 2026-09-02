import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  cancelCalendarEvent,
  createCalendar,
  createCalendarEvent,
  deleteCalendar,
  getCalendarEvent,
  getCalendarEvents,
  getCalendars,
  updateCalendar,
  updateCalendarEvent,
  updateCalendarEventResponse,
} from "../api/calendar.api";
import {
  AttendeeResponseStatus,
  CalendarEventFilters,
  CreateCalendarEventPayload,
  CreateCalendarPayload,
  UpdateCalendarEventPayload,
  UpdateCalendarPayload,
  RecurrenceScope,
} from "../types/calendar.types";

export const calendarKeys = {
  all: ["calendar"] as const,
  calendars: ["calendar", "calendars"] as const,
  events: (filters: CalendarEventFilters) =>
    ["calendar", "events", filters] as const,
  event: (eventId: string) => ["calendar", "events", eventId] as const,
};

export function useCalendarCalendars() {
  return useQuery({
    queryKey: calendarKeys.calendars,
    queryFn: getCalendars,
    staleTime: 60_000,
  });
}

export function useCreateCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCalendarPayload) => createCalendar(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      calendarId,
      payload,
    }: {
      calendarId: string;
      payload: UpdateCalendarPayload;
    }) => updateCalendar(calendarId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (calendarId: string) => deleteCalendar(calendarId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useCalendarEvents(filters: CalendarEventFilters) {
  return useQuery({
    queryKey: calendarKeys.events(filters),
    queryFn: () => getCalendarEvents(filters),
    enabled: Boolean(filters.startAt && filters.endAt),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCalendarEvent(eventId?: string | null) {
  return useQuery({
    queryKey: calendarKeys.event(eventId || ""),
    queryFn: () => getCalendarEvent(eventId!),
    enabled: Boolean(eventId),
    staleTime: 30_000,
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCalendarEventPayload) =>
      createCalendarEvent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      payload,
    }: {
      eventId: string;
      payload: UpdateCalendarEventPayload;
    }) => updateCalendarEvent(eventId, payload),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.event(variables.eventId),
      });
    },
  });
}

export function useCancelCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, scope }: { eventId: string; scope: RecurrenceScope }) =>
      cancelCalendarEvent(eventId, scope),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useUpdateCalendarEventResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      responseStatus,
    }: {
      eventId: string;
      responseStatus: AttendeeResponseStatus;
    }) => updateCalendarEventResponse(eventId, responseStatus),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.event(variables.eventId),
      });
    },
  });
}
