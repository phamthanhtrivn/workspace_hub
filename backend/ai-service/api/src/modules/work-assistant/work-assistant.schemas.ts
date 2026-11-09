import { z } from "zod";
import { timeZoneSchema } from "./work-time";

export const audienceSchema = z
  .enum(["mine", "projects", "calendar"])
  .default("mine");

export const scopeSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    audience: audienceSchema,
  })
  .strict()
  .refine(
    (s) => !s.projectId || s.audience === "mine",
    "Project scope only supports mine audience",
  );
export const querySchema = z
  .object({
    projectId: z.string().uuid().optional(),
    before: z.string().uuid().optional(),
  })
  .strict();

export const overviewSchema = scopeSchema.safeExtend({
  timeZone: timeZoneSchema.optional(),
});
export const sessionSchema = querySchema.extend({
  sessionId: z.string().uuid().optional(),
});
export const sessionsSchema = querySchema.extend({
  before: z.string().min(1).max(512).optional(),
});
export const createSessionSchema = z
  .object({ projectId: z.string().uuid().optional() })
  .strict();
export const messageSchema = z
  .object({
    question: z.string().trim().min(1).max(4000),
    requestId: z.string().uuid(),
    audience: audienceSchema,
    timeZone: timeZoneSchema.optional(),
  })
  .strict();
