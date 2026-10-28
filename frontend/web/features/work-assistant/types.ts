export type Audience = "mine" | "project";
export type TaskReference = {
  id: string;
  kind: "project" | "calendar";
  projectId?: string;
  title: string;
  url: string;
  dueAt: string | null;
};
export type WorkTask = TaskReference & {
  allDay: boolean;
  priority: string;
  status: string;
  overdue: boolean;
  dueToday: boolean;
  blockedBy: { id: string; title: string }[];
  unblocks: number;
  description?: string | null;
  project?: string;
};
export type WorkMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: TaskReference[];
  created_at: string;
  hidden?: boolean;
  context?: {
    scope: { projectId?: string; audience: Audience };
    fetchedAt: string;
    timeZone: string;
    days: 7 | 30;
  };
};
export type WorkSession = {
  id: string;
  projectId: string | null;
  messages: WorkMessage[];
  nextCursor: string | null;
};
export type WorkConversation = {
  id: string;
  projectId: string | null;
  title: string;
  updatedAt: string;
};
export type WorkConversationPage = {
  sessions: WorkConversation[];
  nextCursor: string | null;
};
export type SourceState = {
  state: "ready" | "empty" | "partial" | "unavailable";
  message?: string;
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
};
export type WorkOverview = {
  scope: { projectId?: string; audience: Audience };
  date: string;
  fetchedAt: string;
  timeZone: string;
  days: 7 | 30;
  sources: { project: SourceState; calendar: SourceState };
  tasks: WorkTask[];
  detailPartial: boolean;
  busyPartial: boolean;
  metrics: {
    project: Metrics | null;
    personal: Metrics | null;
    focusSeconds: number | null;
    focusSessions: number | null;
  };
  schedulingBasis: "calendar";
  freeSlots: { startAt: string; endAt: string }[];
};
