import { TaskStatus } from "../types/project";

export const PROJECT_CALENDAR_DESKTOP_QUERY = "(min-width: 768px) and (pointer: fine)";

export const PROJECT_CALENDAR_LAYOUT = {
  desktop: { visibleLanes: 3, rowHeight: 32, headerHeight: 44, footerHeight: 36 },
  compact: { visibleLanes: 2, rowHeight: 44, headerHeight: 56, footerHeight: 48 },
  rowGap: 4,
} as const;

export const CALENDAR_TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "border-border bg-muted hover:bg-accent text-muted-foreground",
  [TaskStatus.IN_PROGRESS]: "border-info-outline bg-info-soft hover:bg-info-soft text-info-content",
  [TaskStatus.IN_REVIEW]: "border-warning-outline bg-warning-soft hover:bg-warning-soft text-warning-content",
  [TaskStatus.DONE]: "border-success-outline bg-success-soft hover:bg-success-soft text-success-content",
  [TaskStatus.CANCELLED]: "border-destructive-outline bg-destructive-soft hover:bg-destructive-soft text-destructive-content",
};
