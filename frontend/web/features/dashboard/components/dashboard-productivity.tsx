"use client";
import dynamic from "next/dynamic";
import { DashboardPanel, QueryFeedback } from "./dashboard-panel";
import { formatMinutes } from "../utils/dashboard.utils";
import type { useDashboard } from "../hooks/use-dashboard";
const ProductivityChart = dynamic(
  () => import("./dashboard-productivity-chart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-48 animate-pulse rounded-lg bg-slate-50" />
    ),
  },
);

export function DashboardProductivity({
  dashboard,
}: {
  dashboard: ReturnType<typeof useDashboard>;
}) {
  return (
    <DashboardPanel
      title="Productivity"
      href="/pomodoro"
      description="Focus time over the last 7 days"
    >
      <QueryFeedback query={dashboard.focus} label="focus report" />
      {dashboard.focus.isSuccess && (
        <>
          <p className="mb-5 text-3xl font-medium tracking-tight text-[var(--color-primary-dark)]">
            {formatMinutes(
              dashboard.daily.reduce((sum, day) => sum + day.minutes, 0),
            )}
            <span className="ml-2 text-xs font-normal text-slate-500">
              recorded focus
            </span>
          </p>
          <ProductivityChart days={dashboard.daily} />
          <details className="mt-3 text-xs text-slate-500">
            <summary className="cursor-pointer">Daily totals</summary>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {dashboard.daily.map((day) => (
                <li key={day.date}>
                  {day.date}: {formatMinutes(day.minutes)}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </DashboardPanel>
  );
}
