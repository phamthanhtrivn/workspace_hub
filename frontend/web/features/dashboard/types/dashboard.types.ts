export interface DashboardTask {
  key: string;
  title: string;
  href: string;
  source: "calendar" | "project";
  sourceId: string;
  projectName?: string;
  dueAt: string | null;
  dateOnly: boolean;
  priority: string;
}

export interface DayItem {
  key: string;
  title: string;
  href: string;
  kind: "Event" | "Task" | "Meeting";
  at: string;
  allDay: boolean;
}

export interface FocusDay {
  date: string;
  minutes: number;
  sessions: number;
}
