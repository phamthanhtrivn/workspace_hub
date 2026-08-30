import { describe, expect, it } from "vitest";
import {
  CalendarEvent,
  EventSourceType,
  EventStatus,
  EventVisibility,
} from "../types/calendar.types";
import { formatLocalDateKey } from "./calendar-date.utils";
import { mapCalendarEventToFullCalendar } from "./calendar-event.utils";

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "event-1",
    calendarId: "calendar-1",
    createdBy: "user-1",
    updatedBy: null,
    title: "All-day event",
    description: null,
    location: null,
    startAt: new Date(2026, 7, 25, 0, 0, 0).toISOString(),
    endAt: new Date(2026, 7, 25, 23, 59, 0).toISOString(),
    allDay: false,
    color: null,
    status: EventStatus.CONFIRMED,
    visibility: EventVisibility.DEFAULT,
    recurrenceRule: null,
    recurrenceParentId: null,
    originalStartAt: null,
    sourceType: EventSourceType.USER,
    sourceId: null,
    exceptionDates: [],
    documentIds: [],
    cancelledAt: null,
    createdAt: "2026-08-25T00:00:00.000Z",
    updatedAt: "2026-08-25T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapCalendarEventToFullCalendar", () => {
  it("places a legacy full-day range in the all-day row", () => {
    const event = createEvent();
    const mapped = mapCalendarEventToFullCalendar(event);
    const expectedEnd = new Date(2026, 7, 26, 0, 0, 0);

    expect(mapped.allDay).toBe(true);
    expect(mapped.start).toBe("2026-08-25");
    expect(mapped.end).toBe(formatLocalDateKey(expectedEnd));
    expect((mapped.extendedProps?.model as CalendarEvent).allDay).toBe(true);
  });

  it("keeps a timed event in the time grid", () => {
    const event = createEvent({
      startAt: new Date(2026, 7, 25, 9, 0, 0).toISOString(),
      endAt: new Date(2026, 7, 25, 10, 0, 0).toISOString(),
    });
    const mapped = mapCalendarEventToFullCalendar(event);

    expect(mapped.allDay).toBe(false);
    expect(mapped.start).toBe(event.startAt);
    expect(mapped.end).toBe(event.endAt);
  });

  it("marks task events for the Google-style task renderer", () => {
    const event = createEvent({ sourceType: EventSourceType.TASK });
    const mapped = mapCalendarEventToFullCalendar(event);

    expect(mapped.classNames).toContain("calendar-task-event");
    expect(mapped.extendedProps?.sourceType).toBe(EventSourceType.TASK);
  });

  it("applies the selected task calendar color to task events", () => {
    const event = createEvent({
      sourceType: EventSourceType.TASK,
      color: "#dc2626",
    });
    const mapped = mapCalendarEventToFullCalendar(event, "#16a34a");

    expect(mapped.backgroundColor).toBe("#16a34a");
    expect(mapped.borderColor).toBe("#16a34a");
    expect(mapped.extendedProps?.hasCustomEventColor).toBe(false);
  });

  it("applies the current calendar display color to every calendar event", () => {
    const event = createEvent({ color: "#2563eb" });
    const mapped = mapCalendarEventToFullCalendar(event, "#f97316");

    expect(mapped.backgroundColor).toBe("#f97316");
    expect(mapped.borderColor).toBe("#f97316");
    expect(mapped.extendedProps?.calendarColor).toBe("#f97316");
    expect(mapped.extendedProps?.eventColor).toBe("#f97316");
    expect(mapped.extendedProps?.hasCustomEventColor).toBe(false);
  });
});
