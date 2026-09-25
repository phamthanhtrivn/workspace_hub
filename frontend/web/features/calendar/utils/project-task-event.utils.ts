import type { EventInput } from "@fullcalendar/core";
import type { Project, Task } from "@/features/project/types/project";
import { taskDateKey } from "@/features/project/utils/task-dates";

export const PROJECT_TASK_EVENT_PREFIX = "project-task:";

function nextDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function mapProjectTaskToCalendarEvent(
  task: Task,
  project: Project,
): EventInput | null {
  if (task.archived || task.projectId !== project.id || !task.startDate || !task.dueDate) {
    return null;
  }

  const start = new Date(task.startDate);
  const end = new Date(task.dueDate);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end.getTime() < start.getTime()
  ) {
    return null;
  }

  const startKey = taskDateKey(task.startDate, task.allDay);
  const endKey = taskDateKey(task.dueDate, task.allDay);
  if (task.allDay && (!startKey || !endKey || endKey < startKey)) return null;

  return {
    id: `${PROJECT_TASK_EVENT_PREFIX}${task.id}`,
    title: task.title,
    start: task.allDay ? startKey : task.startDate,
    end: task.allDay
      ? nextDateKey(endKey)
      : end.getTime() === start.getTime()
        ? new Date(end.getTime() + 15 * 60_000).toISOString()
        : task.dueDate,
    allDay: task.allDay,
    backgroundColor: project.color,
    borderColor: project.color,
    textColor: "#ffffff",
    editable: false,
    startEditable: false,
    durationEditable: false,
    classNames: ["calendar-task-event", "calendar-project-task-event"],
    extendedProps: {
      projectTask: task,
      projectId: project.id,
      projectColor: project.color,
      completedAt: task.completedAt,
    },
  };
}

export function mapProjectTasksToCalendarEvents(
  tasks: Task[],
  project: Project | undefined,
): EventInput[] {
  if (!project) return [];
  return tasks.flatMap((task) => {
    const event = mapProjectTaskToCalendarEvent(task, project);
    return event ? [event] : [];
  });
}
