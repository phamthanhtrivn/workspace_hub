export const POMODORO_REPORT_PAGE_SIZE = 15;
export const POMODORO_REPORT_MAX_DAYS = 90;
export const POMODORO_REPORT_STALE_TIME_MS = 30_000;
export const POMODORO_REPORT_DEFAULT_FILTERS = { source: "all", project: "", task: "" } as const;

export const POMODORO_REPORT_SOURCES = [
  { value: "all", label: "All sources" },
  { value: "project", label: "Project" },
  { value: "personal", label: "Personal" },
] as const;

export const POMODORO_REPORT_PRESETS = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
] as const;

export const POMODORO_REPORT_COPY = {
  title: "History & reports",
  description: "Review your focus time and sessions across the selected dates.",
  fromDate: "From date",
  toDate: "To date",
  project: "Project",
  task: "Task",
  source: "Session source",
  allProjects: "All projects",
  allTasks: "All tasks",
  dateRange: "Date range",
  sessionFilters: "Filter sessions",
  sessionFiltersHint: "Applies immediately to the applied dates above.",
  sourceHint: "Choose project sessions or personal focus.",
  personalSourceHint: "Sessions without a project, including free focus.",
  projectHint: "Projects with sessions in the applied dates.",
  taskHint: "Tasks with sessions in the applied dates.",
  projectTaskHint: "Tasks with sessions in the selected project.",
  dateRanges: "Quick date ranges",
  rangeHint: `Choose up to ${POMODORO_REPORT_MAX_DAYS} days through today. Sessions use their start date in local time.`,
  apply: "Apply",
  cancel: "Cancel",
  unapplied: "Date changes not applied",
  appliedRange: "Applied dates",
  projectReset: "The selected project has no sessions in this range. Project and task filters were cleared.",
  taskReset: "The selected task has no sessions in this range. The task filter was cleared.",
  invalidDate: "Choose a valid date.",
  futureDate: "Choose today or an earlier date.",
  reversedDates: "The end date must be on or after the start date.",
  rangeTooLong: `Each report supports a maximum of ${POMODORO_REPORT_MAX_DAYS} days.`,
  invalidRange: "Please choose valid start and end dates.",
  loading: "Loading report…",
  updating: "Updating…",
  loadFailed: "Unable to load the report.",
  retry: "Retry",
  focusTime: "Focus time",
  completed: "Completed focus sessions",
  stopped: "Stopped focus sessions",
  total: "Total sessions",
  totalHint: "Includes focus and break sessions",
  dailyStats: "Daily stats",
  hideEmpty: "Hide empty days",
  noActiveDays: "No sessions in this range match your filters.",
  showAllDays: "Show all days",
  date: "Date",
  focus: "Focus time",
  completedColumn: "Completed",
  tableCaption: "Focus time and completed focus sessions by day",
  pagination: "Daily stats pagination",
  dayCount: (visible: number, total: number) => `${visible} of ${total} ${total === 1 ? "day" : "days"}`,
} as const;
