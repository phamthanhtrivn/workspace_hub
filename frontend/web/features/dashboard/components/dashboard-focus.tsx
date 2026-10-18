import { DashboardPanel, QueryFeedback } from "./dashboard-panel";
import { formatMinutes } from "../utils/dashboard.utils";
import type { FocusDay } from "../types/dashboard.types";
export function DashboardFocus({
  today,
  query,
}: {
  today?: FocusDay;
  query: { isPending: boolean; isError: boolean; refetch: () => unknown };
}) {
  return (
    <DashboardPanel title="Focus today" href="/pomodoro" tone="focus">
      <QueryFeedback query={query} label="today's focus" />
      {today && (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="min-w-0 break-words text-2xl font-semibold text-foreground tabular-nums">
            {formatMinutes(today.minutes)}
          </p>
          <p className="text-xs text-muted-foreground">
            {today.sessions} completed{" "}
            {today.sessions === 1 ? "session" : "sessions"}
          </p>
        </div>
      )}
    </DashboardPanel>
  );
}
