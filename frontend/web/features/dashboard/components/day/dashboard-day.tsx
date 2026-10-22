import type { useDashboard } from "../../hooks/use-dashboard";
import { DashboardPanel, EmptyState, QueryFeedback } from "../common/dashboard-panel";
import { DashboardDayItem } from "./dashboard-day-item";

export function DashboardDay({ dashboard, nextItemKey }: {
  dashboard: ReturnType<typeof useDashboard>;
  nextItemKey?: string;
}) {
  const { events, personal, project, dayMeetings, dayItems, zone } = dashboard;
  return (
    <DashboardPanel title="My day" href="/calendar" description="Your schedule and deadlines for today">
      <QueryFeedback query={events} label="calendar events" />
      <QueryFeedback query={personal} label="personal deadlines" />
      <QueryFeedback query={project} label="project deadlines" />
      <QueryFeedback query={dayMeetings} label="meeting schedule" />
      {!dayItems.length && [events, personal, project, dayMeetings].every((query) => query.isSuccess) && (
        <EmptyState>No events or deadlines today. Make room for focused work.</EmptyState>
      )}
      <ul>
        {dayItems.map((entry) => (
          <DashboardDayItem key={entry.key} entry={entry} zone={zone} isNext={entry.key === nextItemKey} />
        ))}
      </ul>
    </DashboardPanel>
  );
}
