"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardPanel, QueryFeedback } from "../common/dashboard-panel";
import { DashboardDisclosure, DashboardDisclosureContent, DashboardDisclosureTrigger } from "../common/dashboard-disclosure";
import { formatMinutes } from "../../utils/dashboard.utils";
import type { useDashboard } from "../../hooks/use-dashboard";
const ProductivityChart = dynamic(
  () => import("./dashboard-productivity-chart"),
  {
    ssr: false,
    loading: () => (
      <div
        role="status"
        aria-label="Loading focus chart"
        className="h-60 rounded-control bg-muted motion-safe:animate-pulse"
      />
    ),
  },
);

export function DashboardProductivity({
  dashboard,
}: {
  dashboard: ReturnType<typeof useDashboard>;
}) {
  const todayFocus = dashboard.daily.at(-1);
  const totalMinutes = dashboard.daily.reduce((sum, day) => sum + day.minutes, 0);
  return (
    <DashboardDisclosure>
      <DashboardPanel
        title="Productivity"
        href="/pomodoro"
        description="Focus time over the last 7 days"
        footer={dashboard.focus.data !== undefined && <DashboardDisclosureTrigger title="Daily totals" />}
      >
        <QueryFeedback query={dashboard.focus} label="focus report" />
        {dashboard.focus.data !== undefined && (
          <>
            <dl className="mb-5 flex min-w-0 flex-wrap gap-x-6 gap-y-4">
              <div className="min-w-0 flex-1 basis-40">
                <dt className="text-xs text-muted-foreground">Focus today</dt>
                <dd className={`mt-2 break-words text-3xl font-semibold tracking-tight tabular-nums ${todayFocus && todayFocus.minutes > 0 ? "text-link" : "text-foreground"}`}>
                  {todayFocus ? formatMinutes(todayFocus.minutes) : "—"}
                </dd>
                {todayFocus && (
                  <dd className="mt-1 text-xs text-muted-foreground">
                    {todayFocus.sessions} completed {todayFocus.sessions === 1 ? "session" : "sessions"}
                  </dd>
                )}
              </div>
              <div className="min-w-0 flex-1 basis-40">
                <dt className="text-xs text-muted-foreground">Last 7 days</dt>
                <dd className="mt-2 break-words text-2xl font-medium tracking-tight text-foreground tabular-nums">
                  {formatMinutes(totalMinutes)}
                </dd>
                <dd className="mt-1 text-xs text-muted-foreground">Recorded focus</dd>
              </div>
            </dl>
            {totalMinutes > 0 ? <ProductivityChart days={dashboard.daily} /> : (
              <div className="flex flex-col items-start gap-3 border-t border-border py-5">
                <span className="grid size-10 place-items-center rounded-control bg-secondary text-secondary-foreground"><Timer aria-hidden size={20} /></span>
                <div>
                  <p className="text-sm font-medium text-foreground">Make room for a little focused work.</p>
                  <p className="mt-1 text-xs text-muted-foreground">No recorded focus this week. Start when you are ready.</p>
                </div>
                <Button asChild size="sm" className="min-h-11 sm:min-h-9 [@media(pointer:coarse)]:min-h-11 motion-reduce:transition-none"><Link href="/pomodoro">Open Pomodoro</Link></Button>
              </div>
            )}
            <DashboardDisclosureContent>
              <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {dashboard.daily.map((day) => (
                  <li key={day.date} className="min-w-0 break-words">
                    {day.date}: {formatMinutes(day.minutes)}
                  </li>
                ))}
              </ul>
            </DashboardDisclosureContent>
          </>
        )}
      </DashboardPanel>
    </DashboardDisclosure>
  );
}
