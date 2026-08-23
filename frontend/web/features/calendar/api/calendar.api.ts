import { api } from "@/lib/axios";
import {
  ApiResponse,
  AttendeeResponseStatus,
  CalendarEvent,
  CalendarEventFilters,
  CreateCalendarEventPayload,
  CreateCalendarPayload,
  UpdateCalendarEventPayload,
  UpdateCalendarPayload,
  WorkspaceCalendar,
} from "../types/calendar.types";

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
  const response = await api.get<ApiResponse<CalendarEvent[]>>(
    "/api/calendar/events",
    { params: filters },
  );
  return unwrap(response) || [];
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

export async function cancelCalendarEvent(eventId: string): Promise<void> {
  const response = await api.delete<ApiResponse<null>>(
    `/api/calendar/events/${eventId}`,
  );
  unwrap(response);
}

export async function updateCalendarEventResponse(
  eventId: string,
  responseStatus: AttendeeResponseStatus,
) {
  const response = await api.patch(
    `/api/calendar/events/${eventId}/response`,
    { responseStatus },
  );
  return response.data;
}
