"use client";
import { useQuery } from "@tanstack/react-query";
import { getDashboardCompletedTasks } from "../api/dashboard.api";
import { useAppSelector } from "@/store/store";
import { DashboardPanel, QueryFeedback } from "./dashboard-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { buildDashboardActivity } from "../utils/dashboard-activity.utils";
import { DashboardActivityCalendar } from "./dashboard-activity-calendar";

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
  const activity = tasks.data !== undefined ? buildDashboardActivity(tasks.data, today, zone) : null;
  return (
    <DashboardPanel title="Task activity" description="Completed tasks over the last 6 months">
      <QueryFeedback query={tasks} label="completed tasks" />
      {activity ? <DashboardActivityCalendar activity={activity} /> : tasks.data !== undefined ? (
        <div role="status" aria-label="Preparing activity calendar"><Skeleton className="h-32 w-full motion-reduce:animate-none" /></div>
      ) : null}
    </DashboardPanel>
  );
}
