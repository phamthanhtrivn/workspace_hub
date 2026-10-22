import type { MeetingHistoryItem, UpcomingMeetingItem } from "../types/meeting.types";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const relativeTime = new Intl.RelativeTimeFormat("en-US", { numeric: "always" });
const dateTime = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
});

function timestamp(value: string | null) {
  return value ? Date.parse(value) : Number.NaN;
}

export function formatMeetingOverviewDate(value: string | null): string {
  const instant = timestamp(value);
  return Number.isFinite(instant) ? dateTime.format(instant) : "Time unavailable";
}

function formatRelativeTime(milliseconds: number): string {
  const magnitude = Math.abs(milliseconds);
  const unit = magnitude >= DAY_MS ? "day" : magnitude >= HOUR_MS ? "hour" : "minute";
  const divisor = unit === "day" ? DAY_MS : unit === "hour" ? HOUR_MS : MINUTE_MS;
  const amount = Math.max(1, Math.floor(magnitude / divisor));
  return relativeTime.format(milliseconds < 0 ? -amount : amount, unit);
}

export function getUpcomingMeetingRelativeTime(meeting: UpcomingMeetingItem, now: Date): string {
  if (meeting.status === "LIVE") return "In progress";
  const start = timestamp(meeting.scheduledStartAt);
  if (!Number.isFinite(start)) return "Time unavailable";
  const remaining = start - now.getTime();
  if (remaining <= 0) return "Awaiting start";
  if (remaining < MINUTE_MS) return "Starts in less than a minute";
  return `Starts ${formatRelativeTime(remaining)}`;
}

export function getRecentMeetingRelativeTime(meeting: MeetingHistoryItem, now: Date): string {
  const ended = meeting.status === "ENDED" && meeting.endedAt;
  const instant = timestamp(ended || meeting.startedAt || meeting.createdAt);
  if (!Number.isFinite(instant)) return "Time unavailable";
  const elapsed = instant - now.getTime();
  const action = ended ? "Ended" : meeting.startedAt ? "Started" : "Created";
  if (elapsed > 0) return "Time unavailable";
  return elapsed > -MINUTE_MS ? `${action} just now` : `${action} ${formatRelativeTime(elapsed)}`;
}
