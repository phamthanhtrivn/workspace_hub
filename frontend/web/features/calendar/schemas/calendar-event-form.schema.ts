import { z } from "zod";
import { CALENDAR_FORM_COPY as copy } from "../constants/calendar-form-copy";
import {
  CALENDAR_MAX_REMINDERS,
  CALENDAR_MAX_REMINDER_MINUTES_BEFORE,
  CALENDAR_MIN_EVENT_DURATION_MS,
} from "../types/calendar.constants";
import {
  EventSourceType,
  EventStatus,
  EventVisibility,
  RecurrenceScope,
  ReminderMethod,
} from "../types/calendar.types";

const reminderSchema = z.object({
  minutesBefore: z
    .number({ invalid_type_error: copy.reminderInvalidAmount })
    .int(copy.reminderInvalidAmount)
    .min(0, copy.reminderInvalidAmount)
    .max(CALENDAR_MAX_REMINDER_MINUTES_BEFORE, copy.reminderTooEarly),
  method: z.nativeEnum(ReminderMethod),
});

export const calendarEventFormSchema = z
  .object({
    calendarId: z.string().min(1, copy.requiredFields),
    title: z.string().trim().min(1, copy.requiredFields).max(200),
    description: z.string().max(2_000),
    location: z.string().max(500),
    startAt: z.string().min(1, copy.requiredFields),
    endAt: z.string().min(1, copy.requiredFields),
    allDay: z.boolean(),
    useEventColor: z.boolean(),
    color: z.string().nullable(),
    visibility: z.nativeEnum(EventVisibility),
    status: z.nativeEnum(EventStatus),
    recurrenceScope: z.nativeEnum(RecurrenceScope),
    reminders: z.array(reminderSchema).max(CALENDAR_MAX_REMINDERS),
    sourceType: z.nativeEnum(EventSourceType).optional(),
  })
  .superRefine((values, context) => {
    const start = new Date(values.startAt);
    const end = new Date(values.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      context.addIssue({
        code: "custom",
        message: copy.endRangeInvalid,
        path: ["endAt"],
      });
      return;
    }

    if (end.getTime() - start.getTime() < CALENDAR_MIN_EVENT_DURATION_MS) {
      context.addIssue({
        code: "custom",
        message: copy.endRangeTooShort,
        path: ["endAt"],
      });
    }
  });

export type CalendarEventEditorValues = z.infer<typeof calendarEventFormSchema>;
