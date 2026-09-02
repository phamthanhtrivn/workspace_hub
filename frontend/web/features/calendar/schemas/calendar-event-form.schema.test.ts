import { describe, expect, it } from "vitest";
import {
  EventStatus,
  EventVisibility,
  RecurrenceScope,
  ReminderMethod,
} from "../types/calendar.types";
import { calendarEventFormSchema } from "./calendar-event-form.schema";

const validForm = {
  calendarId: "calendar-id",
  title: "Planning",
  description: "",
  location: "",
  startAt: "2026-08-31T09:00",
  endAt: "2026-08-31T10:00",
  allDay: false,
  useEventColor: false,
  color: null,
  visibility: EventVisibility.DEFAULT,
  status: EventStatus.CONFIRMED,
  recurrenceScope: RecurrenceScope.THIS,
  reminders: [{ minutesBefore: 10, method: ReminderMethod.ALERT }],
};

describe("calendar event form schema", () => {
  it("accepts a valid event", () => {
    expect(calendarEventFormSchema.safeParse(validForm).success).toBe(true);
  });

  it("rejects an empty title", () => {
    const result = calendarEventFormSchema.safeParse({
      ...validForm,
      title: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an event shorter than the minimum duration", () => {
    const result = calendarEventFormSchema.safeParse({
      ...validForm,
      endAt: "2026-08-31T09:05",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "calendar.invalidMinimumRange",
      );
    }
  });

  it("rejects more than five reminders", () => {
    const result = calendarEventFormSchema.safeParse({
      ...validForm,
      reminders: Array.from({ length: 6 }, () => ({
        minutesBefore: 10,
        method: ReminderMethod.ALERT,
      })),
    });

    expect(result.success).toBe(false);
  });

  it("matches backend limits for description and reminder lead time", () => {
    expect(
      calendarEventFormSchema.safeParse({
        ...validForm,
        description: "a".repeat(2_001),
      }).success,
    ).toBe(false);
    expect(
      calendarEventFormSchema.safeParse({
        ...validForm,
        reminders: [
          { minutesBefore: 43_201, method: ReminderMethod.ALERT },
        ],
      }).success,
    ).toBe(false);
  });
});
