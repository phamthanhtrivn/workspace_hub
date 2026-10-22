import type { Task } from "../types/project";
import { taskDateKey } from "./task-dates";

export interface CalendarTaskSegment {
  task: Task;
  startColumn: number;
  span: number;
  lane: number;
  showTitle: boolean;
}

type CalendarWeekDay = { key: string; isCurrentMonth?: boolean; tasks: Task[] };

export function buildWeekTaskSegments(weekDays: CalendarWeekDay[]): CalendarTaskSegment[] {
  const currentMonthDays = weekDays.filter((day) => day.isCurrentMonth !== false);
  if (currentMonthDays.length === 0) return [];

  const weekStart = currentMonthDays[0].key;
  const weekEnd = currentMonthDays[currentMonthDays.length - 1].key;
  const uniqueTasks = new Map<string, Task>();
  currentMonthDays.forEach((day) =>
    day.tasks.forEach((task) => uniqueTasks.set(task.id, task)),
  );
  const candidates = [...uniqueTasks.values()]
    .map((task) => {
      const taskStart = taskDateKey(task.startDate || task.dueDate, task.allDay);
      const taskEnd = taskDateKey(task.dueDate || task.startDate, task.allDay);
      const segmentStart = taskStart < weekStart ? weekStart : taskStart;
      const segmentEnd = taskEnd > weekEnd ? weekEnd : taskEnd;
      return {
        task,
        taskStart,
        startColumn: weekDays.findIndex((day) => day.key === segmentStart),
        endColumn: weekDays.findIndex((day) => day.key === segmentEnd),
      };
    })
    .filter((segment) => segment.startColumn >= 0 && segment.endColumn >= segment.startColumn)
    .sort((a, b) => a.startColumn - b.startColumn || b.endColumn - a.endColumn);

  const occupiedThrough: number[] = [];
  return candidates.map((segment) => {
    let lane = occupiedThrough.findIndex((endColumn) => endColumn < segment.startColumn);
    if (lane < 0) lane = occupiedThrough.length;
    occupiedThrough[lane] = segment.endColumn;
    return {
      task: segment.task,
      startColumn: segment.startColumn,
      span: segment.endColumn - segment.startColumn + 1,
      lane,
      showTitle: segment.taskStart === weekDays[segment.startColumn].key ||
        segment.startColumn === weekDays.findIndex((day) => day.isCurrentMonth !== false),
    };
  });
}

export function getCalendarWeekLayout(weekDays: CalendarWeekDay[], visibleLanes: number) {
  const visibleSegments = buildWeekTaskSegments(weekDays)
    .filter((segment) => segment.lane < visibleLanes);
  const hiddenTaskCounts = weekDays.map((day, column) => {
    const visibleIds = new Set(visibleSegments
      .filter((segment) => column >= segment.startColumn && column < segment.startColumn + segment.span)
      .map((segment) => segment.task.id));
    return new Set(day.tasks.filter((task) => !visibleIds.has(task.id)).map((task) => task.id)).size;
  });
  return { visibleSegments, hiddenTaskCounts };
}

export function formatCalendarTaskRange(task: Task): string {
  const formatDate = (value?: string) => {
    if (!value) return "";
    const dateOnly = task.allDay || value.length === 10;
    const date = new Date(dateOnly ? `${taskDateKey(value, true)}T00:00:00` : value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, {
      day: "numeric", month: "short", year: "numeric",
      ...(dateOnly ? {} : { hour: "2-digit", minute: "2-digit" }),
    });
  };
  const start = formatDate(task.startDate);
  const end = formatDate(task.dueDate);
  return start && end && start !== end ? `${start} – ${end}` : start || end;
}
