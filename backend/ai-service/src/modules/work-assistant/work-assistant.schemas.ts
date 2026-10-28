import { z } from "zod";

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
