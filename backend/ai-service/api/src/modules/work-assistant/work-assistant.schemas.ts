import { z } from "zod";
import { timeZoneSchema } from "./work-time";

export const scopeSchema = z
  .object({
    projectId: z.string().uuid().optional(),
    audience: z.enum(["mine", "project"]).default("mine"),
  })
  .strict()
  .refine(
    (s) => !!s.projectId || s.audience === "mine",
    "Project scope required",
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
    audience: z.enum(["mine", "project"]).default("mine"),
    timeZone: timeZoneSchema.optional(),
  })
  .strict();
