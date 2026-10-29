import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  cancelCalendarEvent,
  createCalendar,
  createCalendarEvent,
  deleteCalendar,
  getAllCalendarTasks,
  getCalendarEvent,
  getCalendarEvents,
  getCalendars,
  updateCalendar,
  updateCalendarEvent,
  updateCalendarEventResponse,
  updateCalendarTaskCompletion,
  retryCalendarConference,
} from "../api/calendar.api";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
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
  tasks: ["calendar", "tasks"] as const,
  events: (filters: CalendarEventFilters) =>
    ["calendar", "events", filters] as const,
  event: (eventId: string) => ["calendar", "events", eventId] as const,
};

export function useRetryCalendarConference() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: retryCalendarConference, onSuccess: () => queryClient.invalidateQueries({ queryKey: calendarKeys.all }) });
}

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
      void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
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
      void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
    },
  });
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (calendarId: string) => deleteCalendar(calendarId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
    },
  });
}

export function useCalendarEvents(filters: CalendarEventFilters) {
  return useQuery({
    queryKey: calendarKeys.events(filters),
    queryFn: () => getCalendarEvents(filters),
    refetchInterval: query => query.state.data?.some(event => event.conference?.status === "PENDING" || event.conference?.status === "FAILED") ? 3_000 : false,
    enabled: Boolean(filters.startAt && filters.endAt),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCalendarTasks() {
  return useQuery({
    queryKey: calendarKeys.tasks,
    queryFn: getAllCalendarTasks,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCalendarEvent(eventId?: string | null) {
  return useQuery({
    queryKey: calendarKeys.event(eventId || ""),
    refetchInterval: query => ["PENDING", "FAILED"].includes(query.state.data?.conference?.status ?? "") ? 3_000 : false,
    queryFn: async () => {
      try {
        return await getCalendarEvent(eventId!);
      } catch (error: unknown) {
        if (isAxiosError(error) && error.response?.status === 403) {
          return null;
        }
        throw error;
      }
    },
    enabled: Boolean(eventId),
    staleTime: 0,
    refetchOnMount: "always",
    retry: (failureCount, error: unknown) => {
      if (isAxiosError(error) && error.response?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useCreateCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCalendarEventPayload) =>
      createCalendarEvent(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
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
      void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.event(variables.eventId),
      });
    },
  });
}

export function useUpdateCalendarTaskCompletion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      completed,
    }: {
      eventId: string;
      completed: boolean;
    }) => updateCalendarTaskCompletion(eventId, completed),
    onSuccess: (event) => {
      queryClient.setQueryData(calendarKeys.event(event.id), event);
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
    },
  });
}

export function useCancelCalendarEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ eventId, scope }: { eventId: string; scope?: RecurrenceScope }) =>
      cancelCalendarEvent(eventId, scope ?? RecurrenceScope.THIS),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.event(variables.eventId),
      });
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
      void queryClient.invalidateQueries({ queryKey: ["projects", "dashboard-completed-tasks"] });
      void queryClient.invalidateQueries({
        queryKey: calendarKeys.event(variables.eventId),
      });
      void queryClient.invalidateQueries({
        queryKey: meetingKeys.upcomingRoot,
      });
    },
  });
}
