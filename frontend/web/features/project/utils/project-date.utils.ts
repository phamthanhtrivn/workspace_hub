import { getDateRangeErrors, getTodayDateValue as getToday } from "@/lib/date-range";
import { PROJECT_DATE_TIME_ZONE } from "../constants/project-form.constants";

export function getTodayDateValue(now = new Date()): string {
  return getToday(now, PROJECT_DATE_TIME_ZONE);
}

export function getCreateProjectDateErrors(
  startDate: string,
  dueDate: string,
  today: string,
): { startDate?: string; dueDate?: string } {
  const errors = getDateRangeErrors({ start: startDate, end: dueDate, today, mode: "create", dateOnly: true });
  return { startDate: errors.start, dueDate: errors.end };
}
