export type CompletionPeriod = 7 | 30;

export interface DashboardCompletedTask {
  key: string;
  completedAt: string;
}

export interface TaskDeadlineSlice {
  label: string;
  count: number;
  percentage: number;
  fill: string;
}

export interface TaskCompletionDay {
  date: string;
  label: string;
  count: number;
}

export interface ProjectWorkload {
  projectId: string;
  projectName: string;
  total: number;
  overdue: number;
  remaining: number;
}
