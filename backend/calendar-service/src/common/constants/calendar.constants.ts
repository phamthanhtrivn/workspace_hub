export const CALENDAR_DEFAULTS = {
  NAME: 'Personal',
  ICON: '📅',
  COLOR: '#2563eb',
  TIMEZONE: 'Asia/Bangkok',
  DEFAULT_REMINDER_MINUTES: 10,
  MAX_ATTENDEES: 100,
  MAX_REMINDERS: 5,
} as const;

export const CALENDAR_ERROR_MESSAGES = {
  MISSING_USER_ID: 'Missing x-user-id header',
  MISSING_REQUIRED_INFO: 'Missing required information',
  CALENDAR_NOT_FOUND: 'Calendar not found',
  EVENT_NOT_FOUND: 'Calendar event not found',
  FORBIDDEN_CALENDAR: 'You are not allowed to manage this calendar',
  FORBIDDEN_DEFAULT_CALENDAR_DELETE: 'Default calendar cannot be deleted',
  FORBIDDEN_EVENT: 'You are not allowed to access this event',
  FORBIDDEN_EVENT_UPDATE: 'Only the event creator or calendar owner can update this event',
  FORBIDDEN_RESPONSE: 'Only invited attendees can respond to this event',
  INVALID_EVENT_RANGE: 'Event endAt must be after startAt',
  TOO_MANY_ATTENDEES: 'Too many attendees',
  TOO_MANY_REMINDERS: 'Too many reminders',
} as const;

export const CALENDAR_SUCCESS_MESSAGES = {
  CALENDAR_CREATED: 'Calendar created successfully',
  CALENDARS_LISTED: 'Calendars retrieved successfully',
  CALENDAR_UPDATED: 'Calendar updated successfully',
  CALENDAR_DELETED: 'Calendar deleted successfully',
  EVENT_CREATED: 'Event created successfully',
  EVENTS_LISTED: 'Events retrieved successfully',
  EVENT_RETRIEVED: 'Event retrieved successfully',
  EVENT_UPDATED: 'Event updated successfully',
  EVENT_CANCELLED: 'Event cancelled successfully',
  EVENT_RESPONSE_UPDATED: 'Event response updated successfully',
} as const;
