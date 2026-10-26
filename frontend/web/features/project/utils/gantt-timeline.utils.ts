import type { Task } from "../types/project";
import type { GanttBarGeometry, GanttRange, GanttScale, GanttZoomMode } from "../types/gantt";
import { GANTT_INITIAL_HORIZON_DAYS, GANTT_ZOOM_CONFIG } from "../constants/gantt.constants";
import { taskDateKey } from "./task-dates";

export function toLocalDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function dayDifference(from: Date, to: Date): number {
  return Math.round((Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
    Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86_400_000);
}

export function taskStart(task: Task): Date | undefined {
  const value = task.startDate || task.dueDate;
  return value ? toLocalDate(taskDateKey(value, task.allDay)) : undefined;
}

export function taskEnd(task: Task): Date | undefined {
  const value = task.dueDate || task.startDate;
  return value ? toLocalDate(taskDateKey(value, task.allDay)) : undefined;
}

export function getInitialGanttAnchor(tasks: Task[], today: Date): Date {
  const dated = tasks.filter((task) => !task.archived)
    .map((task) => ({ start: taskStart(task), end: taskEnd(task) }))
    .filter((dates): dates is { start: Date; end: Date } =>
      Boolean(dates.start && dates.end && Number.isFinite(dates.start.getTime()) && Number.isFinite(dates.end.getTime())));
  if (dated.length === 0) return today;
  const first = new Date(Math.min(...dated.map(({ start }) => start.getTime())));
  const last = new Date(Math.max(...dated.map(({ end }) => end.getTime())));
  return today >= addDays(first, -GANTT_INITIAL_HORIZON_DAYS) && today <= addDays(last, GANTT_INITIAL_HORIZON_DAYS)
    ? today : first;
}

export function getGanttRange(anchor: Date, zoomMode: GanttZoomMode): GanttRange {
  if (zoomMode === "month") return {
    start: new Date(anchor.getFullYear(), 0, 1), end: new Date(anchor.getFullYear(), 11, 31),
  };
  const start = addDays(anchor, -((anchor.getDay() + 6) % 7));
  return { start, end: addDays(start, GANTT_ZOOM_CONFIG[zoomMode].spanDays - 1) };
}

export function navigateGanttAnchor(anchor: Date, zoomMode: GanttZoomMode, direction: -1 | 1): Date {
  if (zoomMode !== "month") return addDays(anchor, direction * GANTT_ZOOM_CONFIG[zoomMode].shiftDays);
  const year = anchor.getFullYear() + direction;
  const lastDay = new Date(year, anchor.getMonth() + 1, 0).getDate();
  return new Date(year, anchor.getMonth(), Math.min(anchor.getDate(), lastDay));
}

// Fraction is a fraction of the calendar day, so bars and markers share one scale.
export function getGanttDatePosition(date: Date, scale: GanttScale, fraction = 0): number {
  if (scale.zoomMode !== "month") return (dayDifference(scale.range.start, date) + fraction) * scale.dayWidth;
  const monthOffset = (date.getFullYear() - scale.range.start.getFullYear()) * 12 + date.getMonth();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return (monthOffset + (date.getDate() - 1 + fraction) / daysInMonth) * scale.monthWidth;
}

export function getGanttBarGeometry(start: Date, end: Date, scale: GanttScale): GanttBarGeometry {
  const placement = end < scale.range.start ? "before" : start > scale.range.end ? "after" : "inside";
  if (placement !== "inside") return { placement, left: 0, width: 0, clippedStart: false, clippedEnd: false };
  const visibleStart = start < scale.range.start ? scale.range.start : start;
  const visibleEnd = end > scale.range.end ? scale.range.end : end;
  const left = getGanttDatePosition(visibleStart, scale);
  const right = getGanttDatePosition(addDays(visibleEnd, 1), scale);
  return { placement, left, width: right - left, clippedStart: start < scale.range.start, clippedEnd: end > scale.range.end };
}

export function getGanttHitArea(left: number, width: number, timelineWidth: number, minimumWidth: number) {
  const hitWidth = Math.min(timelineWidth, Math.max(width, minimumWidth));
  return { left: Math.max(0, Math.min(left + width / 2 - hitWidth / 2, timelineWidth - hitWidth)), width: hitWidth };
}

export function getGanttScrollLeft(position: number, viewportWidth: number, labelWidth: number, timelineWidth: number): number {
  const visibleWidth = Math.max(0, viewportWidth - labelWidth);
  return Math.max(0, Math.min(position - visibleWidth / 2, timelineWidth - visibleWidth));
}
