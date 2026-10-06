"use client";
import { useQuery } from "@tanstack/react-query";
import { Temporal } from "temporal-polyfill";
import { getDashboardCompletedTasks } from "../api/dashboard.api";
import { useAppSelector } from "@/store/store";
import { DashboardPanel, QueryFeedback } from "./dashboard-panel";
import { dateInZone } from "../utils/dashboard.utils";

const levels = [
  "bg-muted",
  "bg-green-200",
  "bg-green-400",
  "bg-green-600",
  "bg-green-800",
];
export function DashboardProjectActivity({
  today,
  zone,
}: {
  today: string;
  zone: string;
}) {
  const userId = useAppSelector((state) => state.auth.userId);
  const tasks = useQuery({
    queryKey: ["projects", "dashboard-completed-tasks", userId],
    queryFn: () => getDashboardCompletedTasks(userId!),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const counts = new Map<string, number>();
  for (const task of tasks.data || []) {
    const date = dateInZone(task.completedAt, zone);
    counts.set(date, (counts.get(date) || 0) + 1);
  }
  const end = today ? Temporal.PlainDate.from(today) : null;
  const start = end
    ?.subtract({ weeks: 11 })
    .subtract({ days: end.dayOfWeek % 7 });
  const days =
    start && end
      ? Array.from({ length: 84 }, (_, i) => {
          const date = start.add({ days: i }).toString();
          const count = counts.get(date) || 0;
          return {
            date,
            count,
            future: date > end.toString(),
            level: Math.min(4, count),
          };
        })
      : [];
  const total = days
    .filter((day) => !day.future)
    .reduce((sum, day) => sum + day.count, 0);
  return (
    <DashboardPanel
      title="Task activity"
      description="Completed tasks over the last 12 weeks"
    >
      <QueryFeedback query={tasks} label="completed tasks" />
      {tasks.isSuccess && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary-dark">{total}</span>{" "}
            tasks completed
          </p>
          <div className="flex gap-2">
            <div
              aria-hidden
              className="grid h-32 grid-rows-7 items-center text-[10px] text-muted-foreground"
            >
              <span />
              <span>Mon</span>
              <span />
              <span>Wed</span>
              <span />
              <span>Fri</span>
              <span />
            </div>
            <div
              className="grid h-32 w-56 max-w-full grid-flow-col grid-cols-12 grid-rows-7 gap-1"
              aria-label="Daily completed tasks"
            >
              {days.map((day) => (
                <span
                  key={day.date}
                  role="img"
                  aria-label={
                    day.future
                      ? `${day.date}: future date`
                      : `${day.date}: ${day.count} completed tasks`
                  }
                  title={`${day.date}: ${day.count} completed tasks`}
                  className={`rounded-sm ${day.future ? "invisible" : levels[day.level]}`}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-muted-foreground">
            <span>
              {start?.toString()} – {today}
            </span>
            <span className="flex items-center gap-1">
              Less{" "}
              {levels.map((level) => (
                <span
                  key={level}
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-sm ${level}`}
                />
              ))}{" "}
              More
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Each square represents a day. Hover to see its total.
          </p>
        </div>
      )}
    </DashboardPanel>
  );
}
