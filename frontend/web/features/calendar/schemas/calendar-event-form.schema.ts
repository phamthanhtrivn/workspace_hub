import { z } from "zod";
import { CALENDAR_MIN_EVENT_DURATION_MS } from "../types/calendar.constants";
import {
  EventStatus,
  EventVisibility,
  RecurrenceScope,
  ReminderMethod,
} from "../types/calendar.types";

const reminderSchema = z.object({
  minutesBefore: z.number().int().min(0).max(43_200),
  method: z.nativeEnum(ReminderMethod),
});

export const calendarEventFormSchema = z
  .object({
    calendarId: z.string().min(1, "calendar.requiredFields"),
    title: z.string().trim().min(1, "calendar.requiredFields").max(200),
    description: z.string().max(2_000),
    location: z.string().max(500),
    startAt: z.string().min(1, "calendar.requiredFields"),
    endAt: z.string().min(1, "calendar.requiredFields"),
    allDay: z.boolean(),
    useEventColor: z.boolean(),
    color: z.string().nullable(),
    visibility: z.nativeEnum(EventVisibility),
    status: z.nativeEnum(EventStatus),
    recurrenceScope: z.nativeEnum(RecurrenceScope),
    reminders: z.array(reminderSchema).max(5),
  })
  .superRefine((values, context) => {
    const start = new Date(values.startAt);
    const end = new Date(values.endAt);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      context.addIssue({
        code: "custom",
        message: "calendar.invalidRange",
        path: ["endAt"],
      });
      return;
    }

    if (end.getTime() - start.getTime() < CALENDAR_MIN_EVENT_DURATION_MS) {
      context.addIssue({
        code: "custom",
        message: "calendar.invalidMinimumRange",
        path: ["endAt"],
      });
    }
  });

export type CalendarEventEditorValues = z.infer<typeof calendarEventFormSchema>;
