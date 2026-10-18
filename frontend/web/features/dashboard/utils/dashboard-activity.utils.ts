import { Temporal } from "temporal-polyfill";
import { dateInZone } from "./dashboard.utils";

const ACTIVITY_MONTHS = 6;
const DAYS_PER_WEEK = 7;
const MAX_ACTIVITY_LEVEL = 4;
const MIN_MONTH_LABEL_COLUMNS = 2;

interface ActivityDay {
  date: string;
  label: string;
  count: number;
  level: number;
  inRange: boolean;
  isToday: boolean;
}

interface ActivityMonth {
  label: string;
  column: number;
}

export interface DashboardActivity {
  start: string;
  end: string;
  rangeLabel: string;
  days: ActivityDay[];
  months: ActivityMonth[];
  weekCount: number;
  total: number;
  activeDays: number;
}

export function buildDashboardActivity(
  completedTasks: readonly { completedAt: string }[],
  today: string,
  zone: string,
): DashboardActivity | null {
  if (!today) return null;
  const end = Temporal.PlainDate.from(today);
  const start = end.subtract({ months: ACTIVITY_MONTHS }, { overflow: "constrain" });
  const gridStart = start.subtract({ days: start.dayOfWeek % DAYS_PER_WEEK });
  const gridEnd = end.add({ days: DAYS_PER_WEEK - 1 - (end.dayOfWeek % DAYS_PER_WEEK) });
  const startDate = start.toString();
  const endDate = end.toString();
  const counts = new Map<string, number>();
  for (const task of completedTasks) {
    const date = dateInZone(task.completedAt, zone);
    if (date && date >= startDate && date <= endDate) counts.set(date, (counts.get(date) ?? 0) + 1);
  }

  // These strings already represent local calendar dates; UTC formatting preserves them.
  const fullDate = new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" });
  const shortDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
  const monthName = new Intl.DateTimeFormat("en", { month: "short", timeZone: "UTC" });
  const months: ActivityMonth[] = [];
  let previousMonth = "";
  const days = Array.from({ length: gridStart.until(gridEnd).days + 1 }, (_, index): ActivityDay => {
    const date = gridStart.add({ days: index }).toString();
    const inRange = date >= startDate && date <= endDate;
    const count = inRange ? counts.get(date) ?? 0 : 0;
    const timestamp = new Date(`${date}T12:00:00Z`);
    const month = date.slice(0, 7);
    if (inRange && month !== previousMonth) {
      months.push({ label: monthName.format(timestamp), column: Math.floor(index / DAYS_PER_WEEK) + 1 });
      previousMonth = month;
    }
    return { date, label: fullDate.format(timestamp), count, level: Math.min(MAX_ACTIVITY_LEVEL, count), inRange, isToday: date === endDate };
  });

  return {
    start: startDate,
    end: endDate,
    rangeLabel: `${shortDate.format(new Date(`${startDate}T12:00:00Z`))} – ${shortDate.format(new Date(`${endDate}T12:00:00Z`))}`,
    days,
    // A very short first month can share a week with the next; omit its crowded label.
    months: months.filter((month, index) => !months[index + 1] || months[index + 1].column - month.column >= MIN_MONTH_LABEL_COLUMNS),
    weekCount: days.length / DAYS_PER_WEEK,
    total: [...counts.values()].reduce((sum, count) => sum + count, 0),
    activeDays: counts.size,
  };
}
