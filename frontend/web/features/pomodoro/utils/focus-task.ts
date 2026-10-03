import type { Task, Project } from "../../project/types/project";
import type { CalendarEvent } from "../../calendar/types/calendar.types";
import type { PomodoroActiveTask, PomodoroFocusSource } from "../types/pomodoro";

export type FocusTaskScope = "today" | "all";

export function focusTaskSource(task: PomodoroActiveTask | null): PomodoroFocusSource {
  if (task?.projectId) return "project";
  if (task?.calendarEventId) return "calendar";
  return "free";
}

function dateKey(value: string, allDay = false): string {
  if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function matchesDates(start: string | undefined, end: string | undefined, allDay: boolean, scope: FocusTaskScope, now: Date): boolean {
  if (!start && !end) return scope === "all";
  const startKey = start ? dateKey(start, allDay) : "";
  const endKey = end ? dateKey(end, allDay) : startKey;
  if ((start && !startKey) || (end && !endKey) || (startKey && endKey < startKey)) return false;
  const today = dateKey(now.toISOString());
  if (endKey < today) return false;
  return scope === "all" || ((!startKey || startKey <= today) && endKey >= today);
}

export function isProjectFocusEligible(task: Task, userId: string, scope: FocusTaskScope = "all", now = new Date()): boolean {
  return Boolean(userId) && task.assignees.some((assignee) => assignee.userId === userId) &&
    (task.status === "TODO" || task.status === "IN_PROGRESS") && !task.archived && !task.deletedAt && !task.completedAt &&
    matchesDates(task.startDate, task.dueDate, task.allDay, scope, now);
}

export function isProjectFocusActive(project: Pick<Project, "status" | "archived">): boolean {
  return !project.archived && project.status === "ACTIVE";
}

export function isCalendarFocusEligible(event: CalendarEvent, userId: string, scope: FocusTaskScope = "all", now = new Date()): boolean {
  const isTask = event.sourceType === "TASK" || Boolean(event.description?.includes("[TASK]"));
  const isPersonal = Boolean(event.calendar && !event.calendar.projectId && event.calendar.ownerUserId === userId);
  // A calendar all-day end is exclusive; project due dates are inclusive.
  const exclusiveEnd = event.allDay && event.endAt ? new Date(event.endAt) : null;
  if (exclusiveEnd && !Number.isFinite(exclusiveEnd.getTime())) return false;
  if (exclusiveEnd) exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() - 1);
  const end = exclusiveEnd?.toISOString() ?? event.endAt;
  return isTask && isPersonal && event.permissions?.canManage !== false &&
    event.status !== "CANCELLED" && !event.cancelledAt && !event.completedAt &&
    matchesDates(event.startAt, end, event.allDay, scope, now);
}

export function toProjectFocusTask(task: Task, project?: Pick<Project, "id" | "name" | "color">): PomodoroActiveTask {
  return {
    id: task.id, source: "PROJECT_TASK", projectId: task.projectId,
    projectName: project?.name, projectColor: project?.color,
    title: task.title, description: task.description, priority: task.priority,
    projectStatus: task.status, completedPomodoros: 0,
  };
}

export function toCalendarFocusTask(event: CalendarEvent): PomodoroActiveTask {
  return {
    id: event.id, source: "CALENDAR_TASK", calendarEventId: event.id,
    title: event.title, description: event.description?.replace(/\[TASK\]\s*/g, "").trim(),
    projectName: "Calendar task", projectColor: event.calendar?.color, canEdit: true,
    completedPomodoros: 0,
  };
}

export function normalizeFocusTask(task: PomodoroActiveTask | null): PomodoroActiveTask | null {
  if (!task) return null;
  return { ...task, source: task.source ?? (task.projectId ? "PROJECT_TASK" : task.calendarEventId ? "CALENDAR_TASK" : "PERSONAL_GOAL") };
}

export function sameFocusTask(first: PomodoroActiveTask | null, second: PomodoroActiveTask | null): boolean {
  return first?.id === second?.id && first?.projectId === second?.projectId && first?.calendarEventId === second?.calendarEventId;
}

export function focusTaskLink(task: PomodoroActiveTask): string | null {
  if (task.projectId) return `/projects/${task.projectId}?taskId=${task.id}`;
  if (task.calendarEventId) return `/calendar?event=${task.calendarEventId}`;
  return null;
}

export function focusSessionTaskId(task: PomodoroActiveTask | null): string | undefined {
  return task?.source === "PERSONAL_GOAL" ? undefined : task?.id;
}
