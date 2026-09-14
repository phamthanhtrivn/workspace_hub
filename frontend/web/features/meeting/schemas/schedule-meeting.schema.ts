import { z } from "zod";
import { MIN_SCHEDULED_MEETING_DURATION_MS } from "../types/meeting.constants";

export const scheduleMeetingSchema = z
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
    screenShareEnabled: z.boolean(),
  })
  .superRefine((values, context) => {
    const start = new Date(values.scheduledStartAt);
    const end = new Date(values.scheduledEndAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end.getTime() - start.getTime() < MIN_SCHEDULED_MEETING_DURATION_MS
    ) {
      context.addIssue({
        code: "custom",
        message: "End time must be after start time.",
        path: ["scheduledEndAt"],
      });
    }

    if (start <= new Date()) {
      context.addIssue({
        code: "custom",
        message: "Choose a future start time.",
        path: ["scheduledStartAt"],
      });
    }

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

export type ScheduleMeetingValues = z.infer<typeof scheduleMeetingSchema>;
