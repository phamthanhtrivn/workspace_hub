import { DATE_RANGE_MESSAGES, getTodayDateValue } from "@/lib/date-range";
import type { FocusPickerDateErrors, FocusPickerDateRange, FocusPickerTask } from "../types/focus-picker";

function validDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function getFocusPickerDateErrors(range: FocusPickerDateRange): FocusPickerDateErrors {
  const errors: FocusPickerDateErrors = {};
  if (range.startDate && !validDateKey(range.startDate)) errors.startDate = "Choose a valid start date.";
  if (range.endDate && !validDateKey(range.endDate)) errors.endDate = "Choose a valid end date.";
  if (!errors.startDate && !errors.endDate && range.startDate && range.endDate && range.endDate < range.startDate) {
    errors.endDate = DATE_RANGE_MESSAGES.endBeforeStart;
  }
  return errors;
}

function clock(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function day(value: string | undefined, dateOnly: boolean, timeZone: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  return dateOnly || /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(0, 10) : getTodayDateValue(new Date(value), timeZone);
}

function previousDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function focusPickerSchedule(entry: FocusPickerTask, timeZone: string) {
  const start = entry.source === "project" ? entry.task.startDate : entry.event.startAt;
  const end = entry.source === "project" ? entry.task.dueDate : entry.event.endAt;
  const allDay = entry.source === "project" ? entry.task.allDay : entry.event.allDay;
  const projectDateOnly = entry.source === "project" && allDay;
  const startDate = day(start, projectDateOnly, timeZone);
  let endDate = day(end, projectDateOnly, timeZone);
  // Calendar accepts inclusive 23:59 ends and exclusive midnight ends.
  if (entry.source === "calendar" && allDay && startDate && endDate && start && end &&
    Date.parse(end) > Date.parse(start) && clock(end, timeZone) === "00:00:00" && new Date(end).getUTCMilliseconds() === 0) {
    endDate = previousDay(endDate);
  }
  const sortValue = start || end;
  const sortDate = startDate || endDate || "9999-12-31";
  return { startDate, endDate, sortKey: `${sortDate}T${allDay || !sortValue || /^\d{4}-\d{2}-\d{2}$/.test(sortValue) || !Number.isFinite(Date.parse(sortValue)) ? "00:00:00" : clock(sortValue, timeZone)}` };
}

export function filterFocusPickerTasks(entries: FocusPickerTask[], options: {
  search: string;
  projectId: string;
  range: FocusPickerDateRange;
  today: string;
  timeZone: string;
}) {
  const errors = getFocusPickerDateErrors(options.range);
  const hasDateFilter = Boolean(options.range.startDate || options.range.endDate);
  const query = options.search.trim().toLocaleLowerCase();
  const scheduled: FocusPickerTask[] = [];
  const missingDates: FocusPickerTask[] = [];
  const sortKeys = new Map<string, string>();
  for (const entry of entries) {
    const title = entry.source === "project" ? entry.task.title : entry.event.title;
    if (!title.toLocaleLowerCase().includes(query)) continue;
    if (entry.source === "project" && options.projectId && entry.project.id !== options.projectId) continue;
    const schedule = focusPickerSchedule(entry, options.timeZone);
    sortKeys.set(entry.id, schedule.sortKey);
    if (entry.source === "project" && (!schedule.startDate || !schedule.endDate)) {
      missingDates.push(entry);
      continue;
    }
    if (Object.keys(errors).length || !schedule.startDate || !schedule.endDate) continue;
    if (hasDateFilter
      ? (!options.range.startDate || schedule.endDate >= options.range.startDate) && (!options.range.endDate || schedule.startDate <= options.range.endDate)
      : schedule.startDate <= options.today) scheduled.push(entry);
  }
  const title = (entry: FocusPickerTask) => entry.source === "project" ? entry.task.title : entry.event.title;
  const compare = (first: FocusPickerTask, second: FocusPickerTask) =>
    (sortKeys.get(first.id) ?? "").localeCompare(sortKeys.get(second.id) ?? "") ||
    title(first).localeCompare(title(second)) || first.id.localeCompare(second.id);
  return { scheduled: scheduled.sort(compare), missingDates: missingDates.sort(compare), errors, hasDateFilter };
}
