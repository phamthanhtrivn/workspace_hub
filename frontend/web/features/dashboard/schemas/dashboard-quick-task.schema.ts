import { z } from "zod";
import { Temporal } from "temporal-polyfill";
import { DASHBOARD_QUICK_TASK as copy } from "../constants/dashboard-quick-task";

export const dashboardQuickTaskSchema = z.object({
  title: z.string().trim().min(1, copy.titleRequired).max(copy.maxTitleLength, copy.titleTooLong),
  deadline: z.object({ enabled: z.boolean(), date: z.string(), time: z.string() }).refine((deadline) => {
    if (!deadline.enabled) return true;
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline.date) || (deadline.time && !/^\d{2}:\d{2}$/.test(deadline.time))) return false;
      Temporal.PlainDate.from(deadline.date);
      if (deadline.time) Temporal.PlainTime.from(deadline.time);
      return true;
    } catch {
      return false;
    }
  }, copy.invalidDeadline),
});

export type DashboardQuickTaskInput = z.infer<typeof dashboardQuickTaskSchema>;
