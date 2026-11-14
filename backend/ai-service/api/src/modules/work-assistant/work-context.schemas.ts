import { z } from "zod";

const metricsSchema = z.object({
  open: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  dueToday: z.number().int().nonnegative(),
  completedInPeriod: z.number().int().nonnegative(),
  completedWithDeadline: z.number().int().nonnegative(),
  onTime: z.number().int().nonnegative(),
  late: z.number().int().nonnegative(),
  onTimeRate: z.number().min(0).max(1).nullable(),
  deadlineBasis: z.string(),
  total: z.number().optional(),
  byStatus: z.record(z.string(), z.number()).optional(),
});
const taskSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["project", "calendar"]),
  projectId: z.string().uuid().optional(),
  project: z.string().max(200).optional(),
  title: z.string().max(200),
  description: z.string().max(800).nullable().optional(),
  priority: z.string(),
  status: z.string(),
  startAt: z.string().nullable().optional(),
  dueAt: z.string().nullable(),
  allDay: z.boolean(),
  overdue: z.boolean(),
  dueToday: z.boolean(),
  url: z.string().max(500),
  checklist: z
    .array(z.object({ title: z.string(), completed: z.boolean() }))
    .max(8),
  checklistCount: z.number(),
  childCount: z.number(),
  blockedBy: z
    .array(z.object({ id: z.string().uuid(), title: z.string() }))
    .max(8),
  unblocks: z.number(),
});
export const projectSchema = z.object({
  available: z.literal(true),
  projectIds: z.array(z.string().uuid()).max(1000),
  partial: z.boolean(),
  tasks: z.array(taskSchema).max(60),
  metrics: metricsSchema,
});
export const calendarSchema = z.object({
  available: z.literal(true),
  timeZone: z.string(),
  partial: z.boolean(),
  busyPartial: z.boolean(),
  busy: z
    .array(
      z
        .object({
          startAt: z.string().datetime({ offset: true }),
          endAt: z.string().datetime({ offset: true }),
        })
        .refine(
          (interval) =>
            Date.parse(interval.endAt) > Date.parse(interval.startAt),
          "Invalid busy interval",
        ),
    )
    .max(2000),
  tasks: z.array(taskSchema).max(60),
  metrics: metricsSchema,
  focus: z.object({
    seconds: z.number().nonnegative(),
    sessions: z.number().nonnegative(),
    perTask: z
      .array(
        z.object({
          taskId: z.string().uuid().nullable(),
          eventId: z.string().uuid().nullable(),
          seconds: z.number(),
          sessions: z.number(),
        }),
      )
      .max(60),
  }),
});
