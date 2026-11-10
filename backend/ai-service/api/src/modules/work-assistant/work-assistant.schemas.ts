import { z } from "zod";
import { timeZoneSchema } from "./work-time";

export const audienceSchema = z
  .enum(["mine", "projects", "calendar"])
  .default("mine");

export const scopeSchema = z
  .object({
    projectId: z.string().uuid().toLowerCase().optional(),
    audience: audienceSchema,
  })
  .strict()
  .refine(
    (s) => !s.projectId || s.audience === "mine",
    "Project scope only supports mine audience",
  );
export const conversationContextSchema = z
  .object({
    contextType: z.enum([
      "dashboard",
      "projects",
      "calendar",
      "project_detail",
    ]),
    projectId: z.string().uuid().toLowerCase().optional(),
  })
  .strict()
  .refine(
    (s) => (s.contextType === "project_detail") === !!s.projectId,
    "Only Project Detail requires a projectId",
  );
export const querySchema = conversationContextSchema.safeExtend({
  before: z.string().uuid().optional(),
});

export const overviewSchema = scopeSchema.safeExtend({
  timeZone: timeZoneSchema.optional(),
});
export const sessionSchema = querySchema.safeExtend({
  sessionId: z.string().uuid().optional(),
});
export const sessionsSchema = querySchema.safeExtend({
  before: z.string().min(1).max(512).optional(),
});
export const createSessionSchema = conversationContextSchema;
export const messageSchema = conversationContextSchema
  .safeExtend({
    question: z.string().trim().min(1).max(4000),
    requestId: z.string().uuid(),
    audience: audienceSchema,
    timeZone: timeZoneSchema.optional(),
  })
  .refine(
    (s) =>
      s.audience ===
      (s.contextType === "projects" || s.contextType === "calendar"
        ? s.contextType
        : "mine"),
    "Audience does not match conversation context",
  );
