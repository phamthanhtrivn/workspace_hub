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
      <div
        role="status"
        aria-label="Loading focus chart"
        className="h-60 animate-pulse rounded-control bg-muted"
      />
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
          <p className="mb-5 break-words text-3xl font-medium tracking-tight text-foreground">
            {formatMinutes(
              dashboard.daily.reduce((sum, day) => sum + day.minutes, 0),
            )}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              recorded focus
            </span>
          </p>
          <ProductivityChart days={dashboard.daily} />
          <details className="mt-3 text-xs text-muted-foreground">
            <summary className="min-h-11 cursor-pointer content-center rounded-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-6 [@media(pointer:coarse)]:min-h-11">
              Daily totals
            </summary>
            <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {dashboard.daily.map((day) => (
                <li key={day.date} className="min-w-0 break-words">
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
