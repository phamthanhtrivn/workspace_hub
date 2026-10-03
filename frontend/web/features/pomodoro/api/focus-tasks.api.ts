import { getAllCalendarTasks, getCalendarEvent, getCalendars } from "@/features/calendar/api/calendar.api";
import { getProject, getProjectMembers, getProjects } from "@/features/project/api/project.api";
import { getProjectTasks, getTask, updateTask } from "@/features/project/api/task.api";
import { fetchAllPages } from "@/features/project/api/pagination";
import { getProjectPermissions } from "@/features/project/project-permissions";
import { TaskStatus } from "@/features/project/types/project";
import { POMODORO_TASK_MESSAGES, POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";
import { isCalendarFocusEligible, isProjectFocusActive, isProjectFocusEligible, normalizeFocusTask, toCalendarFocusTask, toProjectFocusTask } from "../utils/focus-task";
import type { PomodoroActiveTask } from "../types/pomodoro";

export async function getAvailableProjectFocusTasks(userId: string) {
  const projects = await fetchAllPages(async (page, limit) => {
    const result = await getProjects({ page, limit });
    return { items: result.data, meta: result.meta };
  }, POMODORO_TASK_SETTINGS.projectPageSize);
  const groups = await Promise.all(projects.filter(isProjectFocusActive).map(async (project) => {
    const tasks = await getProjectTasks(project.id, { onlyMine: true });
    return tasks.filter((task) => task.projectId === project.id && isProjectFocusEligible(task, userId))
      .map((task) => ({ task, project }));
  }));
  return groups.flat();
}

export async function getAvailableCalendarFocusTasks(userId: string) {
  const [events, calendars] = await Promise.all([getAllCalendarTasks(), getCalendars()]);
  const byId = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  return events.map((event) => ({ ...event, calendar: event.calendar ?? byId.get(event.calendarId) }))
    .filter((event) => isCalendarFocusEligible(event, userId))
    .sort((first, second) => (first.taskOrder ?? Number.MAX_SAFE_INTEGER) - (second.taskOrder ?? Number.MAX_SAFE_INTEGER) || Date.parse(first.startAt) - Date.parse(second.startAt));
}

export async function validateFocusTask(target: PomodoroActiveTask, userId: string): Promise<PomodoroActiveTask> {
  const normalized = normalizeFocusTask(target)!;
  if (normalized.source === "PERSONAL_GOAL") {
    if (!normalized.title.trim() || normalized.title.length > POMODORO_TASK_SETTINGS.maxGoalTitleLength) throw new Error("Enter a focus goal of up to 200 characters.");
    return normalized;
  }
  if (normalized.projectId) {
    const [task, project, members] = await Promise.all([
      getTask(normalized.id), getProject(normalized.projectId), getProjectMembers(normalized.projectId),
    ]);
    if (task.projectId !== project.id || !isProjectFocusActive(project) || !isProjectFocusEligible(task, userId)) throw new Error(POMODORO_TASK_MESSAGES.unavailable);
    return { ...toProjectFocusTask(task, project), completedPomodoros: normalized.completedPomodoros,
      canEdit: getProjectPermissions(project, members, userId).canEditTask(task) };
  }
  if (normalized.calendarEventId) {
    const [event, calendars] = await Promise.all([getCalendarEvent(normalized.calendarEventId), getCalendars()]);
    const resolved = { ...event, calendar: event.calendar ?? calendars.find((calendar) => calendar.id === event.calendarId) };
    if (!isCalendarFocusEligible(resolved, userId)) throw new Error(POMODORO_TASK_MESSAGES.unavailable);
    return { ...toCalendarFocusTask(resolved), completedPomodoros: normalized.completedPomodoros };
  }
  throw new Error(POMODORO_TASK_MESSAGES.unavailable);
}

export async function prepareFocusTask(target: PomodoroActiveTask, userId: string): Promise<PomodoroActiveTask> {
  const task = await validateFocusTask(target, userId);
  if (task.projectId && task.projectStatus === "TODO") {
    const updated = await updateTask(task.id, { status: TaskStatus.IN_PROGRESS });
    return { ...task, projectStatus: updated.status };
  }
  return task;
}
