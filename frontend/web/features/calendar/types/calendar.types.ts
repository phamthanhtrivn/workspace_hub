export enum ReminderMethod {
  ALERT = "ALERT",
  PUSH = "PUSH",
  EMAIL = "EMAIL",
}

export enum EventStatus {
  CONFIRMED = "CONFIRMED",
  TENTATIVE = "TENTATIVE",
  CANCELLED = "CANCELLED",
}

export enum AttendeeResponseStatus {
  NEEDS_ACTION = "NEEDS_ACTION",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  TENTATIVE = "TENTATIVE",
}

export enum EventVisibility {
  DEFAULT = "DEFAULT",
  PRIVATE = "PRIVATE",
  PUBLIC = "PUBLIC",
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: unknown;
  timestamp?: string;
}

export interface UserProfileSnapshot {
  id?: string | null;
  userId?: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

export interface WorkspaceCalendar {
  id: string;
  ownerUserId: string;
  projectId: string | null;
  name: string;
  icon: string | null;
  description: string | null;
  color: string;
  isDefault: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEventAttendee {
  id?: string;
  eventId?: string;
  userId: string;
  responseStatus?: AttendeeResponseStatus;
  optional?: boolean;
  profile?: UserProfileSnapshot | null;
}

export interface CalendarEventReminder {
  id?: string;
  eventId?: string;
  minutesBefore: number;
  method: ReminderMethod;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  createdBy: string;
  updatedBy: string | null;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string | null;
  status: EventStatus;
  visibility: EventVisibility;
  recurrenceRule: string | null;
  exceptionDates: string[];
  documentIds: string[];
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  attendees?: CalendarEventAttendee[];
  reminders?: CalendarEventReminder[];
  creatorProfile?: UserProfileSnapshot | null;
  updaterProfile?: UserProfileSnapshot | null;
  calendar?: WorkspaceCalendar;
}

export interface CalendarEventFilters {
  startAt?: string;
  endAt?: string;
  calendarId?: string;
  projectId?: string;
}

export interface CreateCalendarPayload {
  name: string;
  icon?: string | null;
  description?: string;
  projectId?: string;
  color?: string;
  isDefault?: boolean;
  isVisible?: boolean;
}

export interface UpdateCalendarPayload {
  name?: string;
  icon?: string | null;
  description?: string | null;
  projectId?: string | null;
  color?: string;
  isDefault?: boolean;
  isVisible?: boolean;
}

export interface CalendarEventAttendeePayload {
  userId: string;
  optional?: boolean;
}

export interface CalendarEventReminderPayload {
  minutesBefore: number;
  method: ReminderMethod;
}

export type CalendarRecurrenceFrequency =
  | "DAILY"
  | "WEEKLY"
  | "MONTHLY"
  | "YEARLY";

export type CalendarRecurrenceEndType = "never" | "on" | "after";

export type CalendarRecurrenceWeekday =
  | "MO"
  | "TU"
  | "WE"
  | "TH"
  | "FR"
  | "SA"
  | "SU";

export interface CalendarCustomRecurrence {
  interval: number;
  frequency: CalendarRecurrenceFrequency;
  weekdays: CalendarRecurrenceWeekday[];
  endType: CalendarRecurrenceEndType;
  until?: string;
  count?: number;
}

export interface CalendarEventDraft {
  startAt: Date;
  endAt: Date;
  allDay?: boolean;
  calendarId?: string;
}

export interface CalendarEventFormValues {
  calendarId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color?: string | null;
  recurrenceRule?: string | null;
  attendees?: CalendarEventAttendeePayload[];
  reminders: CalendarEventReminderPayload[];
}

export interface CreateCalendarEventPayload {
  calendarId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt: string;
  allDay?: boolean;
  color?: string | null;
  status?: EventStatus;
  visibility?: EventVisibility;
  recurrenceRule?: string | null;
  exceptionDates?: string[];
  documentIds?: string[];
  attendees?: CalendarEventAttendeePayload[];
  reminders?: CalendarEventReminderPayload[];
}

export type UpdateCalendarEventPayload = Partial<CreateCalendarEventPayload>;
