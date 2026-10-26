import {
  PROJECT_DATE_MESSAGES,
  PROJECT_DATE_TIME_ZONE,
} from "../constants/project-form.constants";

export function getTodayDateValue(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: PROJECT_DATE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function getCreateProjectDateErrors(
  startDate: string,
  dueDate: string,
  today: string,
): { startDate?: string; dueDate?: string } {
  return {
    startDate: startDate && startDate < today
      ? PROJECT_DATE_MESSAGES.startDateInPast
      : undefined,
    dueDate: dueDate && !startDate
      ? PROJECT_DATE_MESSAGES.startDateRequiredForEndDate
      : dueDate && startDate > dueDate
        ? PROJECT_DATE_MESSAGES.endDateBeforeStartDate
        : undefined,
  };
}
