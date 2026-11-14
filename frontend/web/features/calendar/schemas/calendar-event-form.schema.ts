import { getDateRangeErrors } from "@/lib/date-range";
import { z } from "zod";
import { isDuplicateReminder } from "../utils/calendar-reminder-policy";
import { CALENDAR_FORM_COPY as copy } from "../constants/calendar-form-copy";
import {
  CALENDAR_MAX_REMINDERS,
  CALENDAR_MAX_REMINDER_MINUTES_BEFORE,
  CALENDAR_MIN_EVENT_DURATION_MS,
  CALENDAR_TASK_TITLE_MAX_LENGTH,
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
    .number({ error: copy.reminderInvalidAmount })
    .int(copy.reminderInvalidAmount)
    .min(0, copy.reminderInvalidAmount)
    .max(CALENDAR_MAX_REMINDER_MINUTES_BEFORE, copy.reminderTooEarly),
  method: z.nativeEnum(ReminderMethod),
});

export const createCalendarEventFormSchema = (mode: "create" | "edit") => z
  .object({
    calendarId: z.string().min(1, copy.requiredFields),
    title: z.string().trim().min(1, copy.requiredFields).max(CALENDAR_TASK_TITLE_MAX_LENGTH),
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
    values.reminders.forEach((reminder, index) => {
      if (isDuplicateReminder(values.reminders, reminder, index)) context.addIssue({
        code: "custom", message: copy.reminderDuplicate, path: ["reminders", index, "minutesBefore"],
      });
    });
    const errors = getDateRangeErrors({
      start: values.startAt, end: values.endAt, mode,
      requireStart: true, requireEnd: true, minDurationMs: CALENDAR_MIN_EVENT_DURATION_MS,
      allowPastStart: true,
    });
    if (errors.start) context.addIssue({ code: "custom", message: errors.start, path: ["startAt"] });
    if (errors.end) context.addIssue({ code: "custom", message: errors.end, path: ["endAt"] });
  });

export const calendarEventFormSchema = createCalendarEventFormSchema("edit");

export type CalendarEventEditorValues = z.infer<typeof calendarEventFormSchema>;
