import { createCalendarEvent, getAllCalendarTasks, getCalendarEvent, getCalendars } from "@/features/calendar/api/calendar.api";
import { calendarEventFormSchema, type CalendarEventEditorValues } from "@/features/calendar/schemas/calendar-event-form.schema";
import { CALENDAR_DEFAULT_TASK_COLOR } from "@/features/calendar/types/calendar.constants";
import { EventSourceType, type CalendarTaskDeadline } from "@/features/calendar/types/calendar.types";
import { fromDateTimeLocal } from "@/features/calendar/utils/calendar-date.utils";
import { writeTaskDeadline } from "@/features/calendar/utils/calendar-task-deadline.utils";
import { getProject, getProjectMembers, getProjects } from "@/features/project/api/project.api";
import { getProjectTasks, getTask, updateTask } from "@/features/project/api/task.api";
import { fetchAllPages } from "@/features/project/api/pagination";
import { getProjectPermissions } from "@/features/project/project-permissions";
import { ProjectStatus, TaskStatus } from "@/features/project/types/project";
import { POMODORO_TASK_MESSAGES, POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";
import { isCalendarFocusEligible, isProjectFocusActive, isProjectFocusEligible, normalizeFocusTask, toCalendarFocusTask, toProjectFocusTask } from "../utils/focus-task";
import type { PomodoroActiveTask } from "../types/pomodoro";
import { getPersonalTaskCalendar } from "../utils/personal-task-calendar";

export async function getAvailableProjectFocusTasks(userId: string) {
  const projects = await fetchAllPages(async (page, limit) => {
    const result = await getProjects({ page, limit, status: ProjectStatus.ACTIVE, hasAssignedTasks: true });
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

export async function createCalendarFocusTask(values: Omit<CalendarEventEditorValues, "calendarId">, userId: string, deadline: CalendarTaskDeadline) {
  const calendar = getPersonalTaskCalendar(await getCalendars(), userId);
  if (!calendar) throw new Error(POMODORO_TASK_MESSAGES.personalCalendarRequired);
  const parsed = calendarEventFormSchema.parse({ ...values, calendarId: calendar.id });
  if (deadline.enabled && (!/^\d{4}-\d{2}-\d{2}$/.test(deadline.date) || !Number.isFinite(Date.parse(`${deadline.date}T${deadline.time || "00:00"}`)))) {
    throw new Error(POMODORO_TASK_MESSAGES.invalidDeadline);
  }
  const description = writeTaskDeadline(parsed.description, deadline.date, deadline.time, deadline.enabled);
  if (description.length > POMODORO_TASK_SETTINGS.maxDescriptionLength) throw new Error(POMODORO_TASK_MESSAGES.descriptionTooLong);
  const event = await createCalendarEvent({
    calendarId: calendar.id,
    title: parsed.title,
    description,
    startAt: fromDateTimeLocal(parsed.startAt),
    endAt: fromDateTimeLocal(parsed.endAt),
    allDay: parsed.allDay,
    sourceType: EventSourceType.TASK,
    color: CALENDAR_DEFAULT_TASK_COLOR,
    reminders: [],
  });
  return { ...event, calendar: event.calendar ?? calendar };
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
