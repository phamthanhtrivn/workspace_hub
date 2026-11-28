import { Temporal } from "temporal-polyfill";
import { MAX_WORKLOAD_PROJECTS, TASK_DEADLINE_CATEGORIES } from "../constants/dashboard-analytics";
import type {
  CompletionPeriod,
  DashboardCompletedTask,
  ProjectWorkload,
  TaskCompletionDay,
  TaskDeadlineSlice,
} from "../types/dashboard-analytics.types";
import type { DashboardTask } from "../types/dashboard.types";
import { dateInZone, taskBucket } from "./dashboard.utils";

export function buildTaskDeadlineDistribution(
  tasks: readonly DashboardTask[],
  today: string,
  zone: string,
): TaskDeadlineSlice[] {
  if (!today) return [];
  const uniqueTasks = [...new Map(tasks.map((task) => [task.key, task])).values()];
  const counts = new Map<string, number>();
  for (const task of uniqueTasks) {
    const bucket = taskBucket(task, today, zone);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return TASK_DEADLINE_CATEGORIES.map(({ bucket, label, fill }) => {
    const count = counts.get(bucket) ?? 0;
    return { label, count, fill, percentage: uniqueTasks.length ? (count / uniqueTasks.length) * 100 : 0 };
  });
}

export function buildTaskCompletionTrend(
  tasks: readonly DashboardCompletedTask[],
  today: string,
  zone: string,
  period: CompletionPeriod,
): TaskCompletionDay[] {
  if (!today) return [];
  const end = Temporal.PlainDate.from(today);
  const formatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
  const days = Array.from({ length: period }, (_, index) => {
    const date = end.subtract({ days: period - 1 - index }).toString();
    return { date, label: formatter.format(new Date(`${date}T12:00:00Z`)), count: 0 };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const task of new Map(tasks.map((task) => [task.key, task])).values()) {
    const day = byDate.get(dateInZone(task.completedAt, zone));
    if (day) day.count += 1;
  }
  return days;
}

export function buildProjectWorkload(
  tasks: readonly DashboardTask[],
  today: string,
  zone: string,
): ProjectWorkload[] {
  if (!today) return [];
  const projects = new Map<string, ProjectWorkload>();
  for (const task of new Map(tasks.map((task) => [task.key, task])).values()) {
    if (task.source !== "project" || !task.projectId) continue;
    const workload = projects.get(task.projectId) ?? {
      projectId: task.projectId,
      projectName: task.projectName || "Untitled project",
      total: 0,
      overdue: 0,
      remaining: 0,
    };
    workload.total += 1;
    if (taskBucket(task, today, zone) === "Overdue") workload.overdue += 1;
    else workload.remaining += 1;
    projects.set(task.projectId, workload);
  }
  return [...projects.values()]
    .sort((a, b) => b.total - a.total || b.overdue - a.overdue || a.projectName.localeCompare(b.projectName) || a.projectId.localeCompare(b.projectId))
    .slice(0, MAX_WORKLOAD_PROJECTS);
}
