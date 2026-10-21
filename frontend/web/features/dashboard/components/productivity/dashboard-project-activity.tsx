"use client";
import type { useDashboardCompletedTasks } from "../../hooks/use-dashboard-completed-tasks";
import { DashboardPanel, QueryFeedback } from "../common/dashboard-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDashboardActivity } from "../../utils/dashboard-activity.utils";
import { DashboardActivityCalendar } from "./dashboard-activity-calendar";
import { DashboardDisclosure, DashboardDisclosureTrigger } from "../common/dashboard-disclosure";

export function DashboardProjectActivity({
  today,
  zone,
  tasks,
}: {
  today: string;
  zone: string;
  tasks: ReturnType<typeof useDashboardCompletedTasks>;
}) {
  const activity = tasks.data !== undefined ? buildDashboardActivity(tasks.data, today, zone) : null;
  return (
    <DashboardDisclosure>
      <DashboardPanel title="Task activity" description="Completed tasks over the last 6 months"
        footer={activity && <DashboardDisclosureTrigger title="Daily totals" />}>
        <QueryFeedback query={tasks} label="completed tasks" />
        {activity ? <DashboardActivityCalendar activity={activity} /> : tasks.data !== undefined ? (
          <div role="status" aria-label="Preparing activity calendar"><Skeleton className="h-32 w-full motion-reduce:animate-none" /></div>
        ) : null}
      </DashboardPanel>
    </DashboardDisclosure>
  );
}
