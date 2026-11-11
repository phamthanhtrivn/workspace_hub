import { CALENDAR_FORM_COPY as copy } from "../constants/calendar-form-copy";

export function getTaskDeadlineError(date: string | null | undefined, time: string | null | undefined, startAt: string, endAt: string): string | undefined {
  if (!date && !time) return;
  const parsed = date ? new Date(`${date}T00:00:00Z`) : null;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date || (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return copy.deadlineInvalid;
  if (time) {
    if (`${date}T${time}` < endAt.slice(0, 16)) return copy.deadlineBeforeEnd;
  } else if (date < startAt.slice(0, 10)) return copy.deadlineBeforeStart;
}

export function formatTaskDeadline(deadline: { deadlineDate?: string | null; deadlineTime?: string | null }): string | null {
  if (!deadline.deadlineDate) return null;
  const value = new Date(`${deadline.deadlineDate}T${deadline.deadlineTime || "00:00"}:00Z`);
  if (!Number.isFinite(value.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
    ...(deadline.deadlineTime ? { hour: "numeric", minute: "2-digit", hour12: true } : {}),
  }).format(value);
}
