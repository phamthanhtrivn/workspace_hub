import type { TaskPriority } from "@/features/project/types/project";

export const DASHBOARD_ACCENTS = {
  project: "bg-dashboard-project-soft text-dashboard-project-content",
  calendar: "bg-dashboard-calendar-soft text-dashboard-calendar-content",
  focus: "bg-dashboard-focus-soft text-dashboard-focus-content",
  meeting: "bg-dashboard-meeting-soft text-dashboard-meeting-content",
  notification:
    "bg-dashboard-notification-soft text-dashboard-notification-content",
  documents: "bg-info-soft text-info-content",
  notebook: "bg-dashboard-project-soft text-dashboard-project-content",
} as const;

export const DASHBOARD_ICON_COLORS = {
  calendar: "text-dashboard-calendar-content",
  meeting: "text-dashboard-meeting-content",
} as const;

export const DASHBOARD_PRIORITY_TONES: Readonly<
  Record<string, string | undefined>
> = {
  URGENT: "bg-destructive-soft text-destructive-content",
  HIGH: "bg-warning-soft text-warning-content",
  LOW: DASHBOARD_ACCENTS.meeting,
} satisfies Partial<Record<TaskPriority, string>>;

export const DASHBOARD_DEADLINE_TONES = {
  Overdue: "bg-destructive-soft text-destructive-content",
  Today: DASHBOARD_ACCENTS.calendar,
  Upcoming: DASHBOARD_ACCENTS.project,
  "No deadline": "bg-secondary text-secondary-foreground",
} as const;
