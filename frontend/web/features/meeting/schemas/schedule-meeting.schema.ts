import { getDateRangeErrors } from "@/lib/date-range";
import { z } from "zod";
import { MIN_SCHEDULED_MEETING_DURATION_MS } from "../types/meeting.constants";

export const createScheduleMeetingSchema = (mode: "create" | "edit") =>
  z
    .object({
      title: z.string().trim().min(1, "Enter a meeting title.").max(200),
      scheduledStartAt: z.string().min(1, "Choose a meeting time."),
      scheduledEndAt: z.string().min(1, "Choose a meeting time."),
      recurrenceRule: z.string().nullable(),
      description: z.string().max(2_000),
      inviteeIds: z.array(z.string()).max(100),
      password: z.string().max(128),
      requirePassword: z.boolean(),
      hasExistingPassword: z.boolean(),
      autoAdmit: z.boolean(),
      chatEnabled: z.boolean(),
      autoRecord: z.boolean(),
      recordingLayout: z.enum(["speaker", "grid", "screen"]),
      screenShareEnabled: z.boolean(),
    })
    .superRefine((values, context) => {
      const errors = getDateRangeErrors({
        start: values.scheduledStartAt,
        end: values.scheduledEndAt,
        mode,
        requireStart: true,
        requireEnd: true,
        minDurationMs: MIN_SCHEDULED_MEETING_DURATION_MS,
      });
      if (errors.start)
        context.addIssue({
          code: "custom",
          message: errors.start,
          path: ["scheduledStartAt"],
        });
      if (
        !errors.start &&
        mode === "create" &&
        new Date(values.scheduledStartAt).getTime() <= Date.now()
      ) {
        context.addIssue({
          code: "custom",
          message: "Choose a meeting start time in the future.",
          path: ["scheduledStartAt"],
        });
      }
      if (errors.end)
        context.addIssue({
          code: "custom",
          message: errors.end,
          path: ["scheduledEndAt"],
        });

      if (
        values.requirePassword &&
        !values.hasExistingPassword &&
        !values.password.trim()
      ) {
        context.addIssue({
          code: "custom",
          message: "Enter a password for this meeting.",
          path: ["password"],
        });
      }
    });

export const scheduleMeetingSchema = createScheduleMeetingSchema("create");

export type ScheduleMeetingValues = z.infer<typeof scheduleMeetingSchema>;
