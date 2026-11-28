import type { UpcomingMeetingItem } from "@/features/meeting/types/meeting.types";
import type { DayItem } from "../types/dashboard.types";
import { dateInZone } from "./dashboard.utils";

const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

export function selectDashboardContext({
  dayItems, upcoming, now, today, zone,
}: {
  dayItems: DayItem[];
  upcoming: UpcomingMeetingItem[];
  now: string | null;
  today: string;
  zone: string;
}) {
  const currentTime = now ? Date.parse(now) : NaN;
  const nextItem = Number.isFinite(currentTime)
    ? dayItems.filter((entry) => !entry.allDay && Date.parse(entry.at) > currentTime && dateInZone(entry.at, zone) === today)
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0]
    : undefined;
  return { nextItem, liveMeeting: upcoming.find((meeting) => meeting.status === "LIVE") };
}

/** Describes the scheduled time, never infers whether a meeting has actually started. */
export function formatScheduledRelativeTime(at: string | null | undefined, now: string | null): string | null {
  if (!at || !now) return null;
  const difference = Date.parse(at) - Date.parse(now);
  if (!Number.isFinite(difference)) return null;
  if (Math.abs(difference) < MINUTE_MS) return difference >= 0 ? "In less than a minute" : "Scheduled just now";
  const minutes = Math.abs(difference) / MINUTE_MS;
  const unit = minutes < MINUTES_PER_HOUR ? "minute" : minutes < MINUTES_PER_DAY ? "hour" : "day";
  const divisor = unit === "minute" ? 1 : unit === "hour" ? MINUTES_PER_HOUR : MINUTES_PER_DAY;
  const amount = difference > 0 ? Math.ceil(minutes / divisor) : -Math.floor(minutes / divisor);
  const relative = new Intl.RelativeTimeFormat("en", { style: "short", numeric: "always" }).format(amount, unit);
  return difference > 0 ? relative[0].toUpperCase() + relative.slice(1) : `Scheduled ${relative}`;
}
