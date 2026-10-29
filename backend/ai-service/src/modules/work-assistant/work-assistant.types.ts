export type Audience = "mine" | "project";
export type WorkScope = { projectId?: string; audience: Audience };
export type WorkTask = {
  id: string;
  kind: "project" | "calendar";
  projectId?: string;
  project?: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  startAt?: string | null;
  dueAt: string | null;
  allDay: boolean;
  overdue: boolean;
  dueToday: boolean;
  url: string;
  checklist: { title: string; completed: boolean }[];
  checklistCount: number;
  childCount: number;
  blockedBy: { id: string; title: string }[];
  unblocks: number;
};
export type Metrics = {
  open: number;
  overdue: number;
  dueToday: number;
  completedInPeriod: number;
  completedWithDeadline: number;
  onTime: number;
  late: number;
  onTimeRate: number | null;
  deadlineBasis: string;
  total?: number;
  byStatus?: Record<string, number>;
};
export type Interval = { startAt: string; endAt: string };
export type TaskReference = Pick<
  WorkTask,
  "id" | "kind" | "projectId" | "title" | "url" | "dueAt"
>;
export type SourceState = {
  state: "ready" | "empty" | "partial" | "unavailable";
  message?: string;
};
export type WorkContext = {
  scope: WorkScope;
  fetchedAt: string;
  date: string;
  timeZone: string;
  days: 7 | 30;
  period: { from: string; to: string };
  projectIds: string[];
  sources: { project: SourceState; calendar: SourceState };
  metrics: {
    project: Metrics | null;
    personal: Metrics | null;
    focusSeconds: number | null;
    focusSessions: number | null;
  };
  comparison?: {
    days: 7 | 30;
    period: WorkContext["period"];
    fetchedAt: string;
    sources: WorkContext["sources"];
    metrics: WorkContext["metrics"];
  }[];
  tasks: WorkTask[];
  detailPartial: boolean;
  busyPartial: boolean;
  focusPerTask: {
    taskId: string | null;
    eventId: string | null;
    seconds: number;
    sessions: number;
  }[];
  schedulingBasis: "calendar";
  freeSlots: Interval[];
  busy: Interval[];
};
export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: TaskReference[];
  project_ids: string[];
  created_at: Date;
  hidden?: boolean;
  context?: {
    scope: WorkScope;
    fetchedAt: string;
    timeZone: string;
    days: 7 | 30;
  };
};
