import { describe, expect, it } from "vitest";
import {
  AttendeeResponseStatus,
  CalendarEvent,
  EventSourceType,
  EventStatus,
  EventVisibility,
  ReminderMethod,
} from "../types/calendar.types";
import { createCalendarEventFormDefaults } from "./calendar-event-form.utils";

const EVENT: CalendarEvent = {
  id: "event-1",
  calendarId: "calendar-1",
  createdBy: "owner-1",
  updatedBy: null,
  title: "  Planning  ",
  description: "Notes",
  location: "Room 1",
  startAt: "2026-09-02T08:00:00.000Z",
  endAt: "2026-09-02T09:00:00.000Z",
  allDay: false,
  color: "#123456",
  status: EventStatus.CONFIRMED,
  visibility: EventVisibility.PRIVATE,
  recurrenceRule: null,
  recurrenceParentId: null,
  timeZone: "Asia/Ho_Chi_Minh",
  originalStartAt: null,
  sourceType: EventSourceType.USER,
  sourceId: null,
  exceptionDates: [],
  documentIds: ["document-1", "document-2"],
  cancelledAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  attendees: [
    {
      userId: "owner-1",
      optional: false,
      responseStatus: AttendeeResponseStatus.ACCEPTED,
    },
    {
      userId: "guest-1",
      optional: true,
      responseStatus: AttendeeResponseStatus.NEEDS_ACTION,
    },
  ],
  reminders: [
    { minutesBefore: 10, method: ReminderMethod.ALERT },
    { minutesBefore: 60, method: ReminderMethod.EMAIL },
  ],
};

describe("createCalendarEventFormDefaults", () => {
  it("creates a new event with the selected calendar and one safe reminder", () => {
    const startAt = new Date("2026-09-02T08:00:00.000Z");
    const endAt = new Date("2026-09-02T09:00:00.000Z");

    const result = createCalendarEventFormDefaults({
      calendarId: "calendar-2",
      draft: { startAt, endAt, allDay: false },
    });

    expect(result.values.calendarId).toBe("calendar-2");
    expect(result.values.reminders).toEqual([
      { minutesBefore: 10, method: ReminderMethod.ALERT },
    ]);
    expect(result.attendees).toEqual([]);
  });

  it("preserves relations while excluding the creator from editable guests", () => {
    const result = createCalendarEventFormDefaults({
      calendarId: "fallback-calendar",
      event: EVENT,
    });

    expect(result.values.reminders).toEqual([
      { minutesBefore: 10, method: ReminderMethod.ALERT },
      { minutesBefore: 60, method: ReminderMethod.EMAIL },
    ]);
    expect(result.attendees).toEqual([{ userId: "guest-1", optional: true }]);
    expect(result.documentIds).toEqual(["document-1", "document-2"]);
    expect(result.showCustomEventColor).toBe(true);
  });
});
