import { api } from "@/lib/axios";
import {
  ApiResponse,
  ApiPagination,
  CalendarPomodoroSession,
  CalendarPomodoroConfig,
  CalendarPomodoroDailyStats,
  CalendarPomodoroTimerState,
  AttendeeResponseStatus,
  CalendarEvent,
  CalendarEventFilters,
  CreateCalendarEventPayload,
  CreateCalendarPayload,
  UpdateCalendarEventPayload,
  UpdateCalendarPayload,
  WorkspaceCalendar,
  RecurrenceScope,
} from "../types/calendar.types";

export async function getCalendarPomodoroTimerState() {
  const response = await api.get<ApiResponse<CalendarPomodoroTimerState | null>>(
    "/api/calendar/pomodoro/state",
  );
  return unwrap(response);
}

export async function saveCalendarPomodoroTimerState(
  state: Omit<CalendarPomodoroTimerState, "version" | "updatedAt" | "status"> & {
    status: "IDLE" | "RUNNING" | "PAUSED";
    expectedVersion: number;
  },
) {
  const response = await api.put<ApiResponse<CalendarPomodoroTimerState>>(
    "/api/calendar/pomodoro/state", state,
  );
  return unwrap(response);
}

export async function clearCalendarPomodoroTimerState(expectedVersion: number) {
  const response = await api.delete<ApiResponse<CalendarPomodoroTimerState>>(
    "/api/calendar/pomodoro/state", { data: { expectedVersion } },
  );
  return unwrap(response);
}

export async function getCalendarPomodoroConfig(signal?: AbortSignal) {
  const response = await api.get<ApiResponse<CalendarPomodoroConfig>>(
    "/api/calendar/pomodoro/config", { signal },
  );
  return unwrap(response);
}

export async function saveCalendarPomodoroConfig(config: CalendarPomodoroConfig, signal?: AbortSignal) {
  const response = await api.put<ApiResponse<CalendarPomodoroConfig>>(
    "/api/calendar/pomodoro/config", config, { signal },
  );
  return unwrap(response);
}

export async function getCalendarPomodoroDailyStats(date?: string, timeZone?: string) {
  const response = await api.get<ApiResponse<CalendarPomodoroDailyStats>>(
    "/api/calendar/pomodoro/stats/daily", { params: { date, timeZone } },
  );
  return unwrap(response);
}

export async function listCalendarPomodoroSessions(params: {
  startAt: string;
  endAt: string;
  eventId?: string;
  taskId?: string;
  page?: number;
  limit?: number;
}, signal?: AbortSignal) {
  const response = await api.get<ApiResponse<{
    sessions: CalendarPomodoroSession[];
    summary: { focusSeconds: number; completedFocusSessions: number };
    pagination: ApiPagination;
  }>>("/api/calendar/pomodoro/sessions", { params, signal });
  return unwrap(response);
}

export async function getTodayCalendarPomodoroSessions(timeZone?: string) {
  const response = await api.get<ApiResponse<CalendarPomodoroSession[]>>(
    "/api/calendar/pomodoro/sessions/today", { params: { timeZone } },
  );
  return unwrap(response);
}

export async function getCalendarPomodoroSessions(eventId: string) {
  const startAt = new Date();
  startAt.setDate(startAt.getDate() - 90);
  return listCalendarPomodoroSessions({
    eventId, startAt: startAt.toISOString(), endAt: new Date().toISOString(),
  });
}

export async function createCalendarPomodoroSession(payload: {
  clientSessionId?: string;
  eventId?: string;
  taskId?: string;
  taskTitle?: string;
  projectId?: string;
  projectName?: string;
  sessionType: CalendarPomodoroSession["sessionType"];
  status: CalendarPomodoroSession["status"];
  startedAt: string;
  endedAt: string;
  plannedSeconds: number;
  actualSeconds: number;
  notes?: string;
  interruptionReason?: string;
}) {
  const response = await api.post<ApiResponse<CalendarPomodoroSession>>(
    "/api/calendar/pomodoro/sessions", payload,
  );
  return unwrap(response);
}

function unwrap<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.message || "API request failed");
  }

  return response.data.data;
}

export async function getCalendars(): Promise<WorkspaceCalendar[]> {
  const response = await api.get<ApiResponse<WorkspaceCalendar[]>>(
    "/api/calendar/calendars",
  );
  return unwrap(response) || [];
}

export async function createCalendar(
  payload: CreateCalendarPayload,
): Promise<WorkspaceCalendar> {
  const response = await api.post<ApiResponse<WorkspaceCalendar>>(
    "/api/calendar/calendars",
    payload,
  );
  return unwrap(response);
}

export async function updateCalendar(
  calendarId: string,
  payload: UpdateCalendarPayload,
): Promise<WorkspaceCalendar> {
  const response = await api.patch<ApiResponse<WorkspaceCalendar>>(
    `/api/calendar/calendars/${calendarId}`,
    payload,
  );
  return unwrap(response);
}

export async function deleteCalendar(calendarId: string): Promise<void> {
  const response = await api.delete<ApiResponse<null>>(
    `/api/calendar/calendars/${calendarId}`,
  );
  unwrap(response);
}

export async function getCalendarEvents(
  filters: CalendarEventFilters,
): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  const limit = 200;
  let page = 1;
  let pagination: ApiPagination | undefined;

  do {
    const response = await api.get<ApiResponse<CalendarEvent[]>>(
      "/api/calendar/events",
      { params: { ...filters, page, limit } },
    );
    events.push(...(unwrap(response) || []));
    pagination = response.data.pagination;
    page += 1;
  } while (pagination && page <= pagination.totalPages);

  return events;
}

export async function getCalendarTasks(
  params?: { page?: number; limit?: number },
): Promise<{ items: CalendarEvent[]; pagination?: ApiPagination }> {
  const response = await api.get<ApiResponse<CalendarEvent[]>>(
    "/api/calendar/events/tasks",
    { params },
  );
  return {
    items: unwrap(response) || [],
    pagination: response.data?.pagination,
  };
}

export async function getAllCalendarTasks(): Promise<CalendarEvent[]> {
  const tasks: CalendarEvent[] = [];
  const limit = 200;
  let page = 1;
  let pagination: ApiPagination | undefined;

  do {
    const response = await api.get<ApiResponse<CalendarEvent[]>>(
      "/api/calendar/events/tasks",
      { params: { page, limit } },
    );
    tasks.push(...(unwrap(response) || []));
    pagination = response.data?.pagination;
    page += 1;
  } while (pagination && page <= pagination.totalPages);

  return tasks;
}

export async function getCalendarEvent(
  eventId: string,
): Promise<CalendarEvent> {
  const response = await api.get<ApiResponse<CalendarEvent>>(
    `/api/calendar/events/${eventId}`,
  );
  return unwrap(response);
}

export async function createCalendarEvent(
  payload: CreateCalendarEventPayload,
): Promise<CalendarEvent> {
  const response = await api.post<ApiResponse<CalendarEvent>>(
    "/api/calendar/events",
    payload,
  );
  return unwrap(response);
}

export async function updateCalendarEvent(
  eventId: string,
  payload: UpdateCalendarEventPayload,
): Promise<CalendarEvent> {
  const response = await api.patch<ApiResponse<CalendarEvent>>(
    `/api/calendar/events/${eventId}`,
    payload,
  );
  return unwrap(response);
}

export async function updateCalendarTaskCompletion(
  eventId: string,
  completed: boolean,
): Promise<CalendarEvent> {
  const response = await api.patch<ApiResponse<CalendarEvent>>(
    `/api/calendar/events/${eventId}/completion`,
    { completed },
  );
  return unwrap(response);
}

export async function updateCalendarTaskOrder(
  eventIds: string[],
): Promise<string[]> {
  const response = await api.patch<ApiResponse<string[]>>(
    "/api/calendar/events/task-order",
    { eventIds },
  );
  return unwrap(response);
}

export async function cancelCalendarEvent(
  eventId: string,
  scope: RecurrenceScope = RecurrenceScope.THIS,
): Promise<void> {
  const response = await api.delete<ApiResponse<null>>(
    `/api/calendar/events/${eventId}`,
    { params: { scope } },
  );
  unwrap(response);
}

export async function updateCalendarEventResponse(
  eventId: string,
  responseStatus: AttendeeResponseStatus,
) {
  const response = await api.patch<ApiResponse<unknown>>(
    `/api/calendar/events/${eventId}/response`,
    { responseStatus },
  );
  return unwrap(response);
}
