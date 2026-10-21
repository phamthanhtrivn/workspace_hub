import Link from "next/link";
import { Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UpcomingMeetingItem } from "@/features/meeting/types/meeting.types";
import { DASHBOARD_FOCUS_PANEL_HEIGHT, DashboardPanel, EmptyState, QueryFeedback } from "../common/dashboard-panel";
import { formatTime } from "../../utils/dashboard.utils";
import type { useDashboard } from "../../hooks/use-dashboard";
import { formatScheduledRelativeTime } from "../../utils/dashboard-context.utils";

function MeetingItem({
  meeting,
  zone,
  now,
  highlighted,
}: {
  meeting: UpcomingMeetingItem;
  zone: string;
  now: string | null;
  highlighted: boolean;
}) {
  const relativeTime = meeting.status !== "LIVE" ? formatScheduledRelativeTime(meeting.scheduledStartAt, now) : null;
  return (
    <li className={`min-w-0 rounded-control border-b border-border p-3 last:border-b-0 motion-safe:transition-colors motion-safe:duration-150 ${highlighted ? "bg-primary-soft" : "hover:bg-muted"}`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 basis-32 line-clamp-2 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
          {meeting.title}
        </p>
        {meeting.status === "LIVE" && (
          <Badge className="bg-success-soft text-success-content">
            Live now
          </Badge>
        )}
      </div>
      {relativeTime && <p className={`mt-1 text-xs font-medium ${highlighted ? "text-primary-soft-foreground" : "text-link"}`}>{relativeTime}</p>}
      <p className={`mt-1 text-xs ${highlighted ? "text-primary-soft-foreground" : "text-muted-foreground"}`}>
        {meeting.scheduledStartAt
          ? new Intl.DateTimeFormat("en", {
              timeZone: zone,
              month: "short",
              day: "numeric",
            }).format(new Date(meeting.scheduledStartAt))
          : ""}
        {meeting.scheduledStartAt &&
          ` · ${formatTime(meeting.scheduledStartAt, zone)}`}
        {meeting.scheduledEndAt &&
          ` – ${formatTime(meeting.scheduledEndAt, zone)}`}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className={`flex items-center gap-1 text-xs ${highlighted ? "text-primary-soft-foreground" : "text-muted-foreground"}`}>
          <Users aria-hidden size={13} />
          {meeting.participantCount} participants
        </span>
        <Button asChild variant={highlighted ? "default" : "outline"} size="sm" className="min-h-11 sm:min-h-8 [@media(pointer:coarse)]:min-h-11 motion-reduce:transition-none">
          <Link
            href={`/meetings/${encodeURIComponent(meeting.joinToken)}`}
            aria-label={`View meeting: ${meeting.title}`}
          >
            <Video aria-hidden size={13} />
            View meeting
          </Link>
        </Button>
      </div>
    </li>
  );
}

export function DashboardMeetings({
  dashboard,
}: {
  dashboard: ReturnType<typeof useDashboard>;
}) {
  return (
    <DashboardPanel title="Upcoming meetings" href="/meetings?tab=upcoming" className={DASHBOARD_FOCUS_PANEL_HEIGHT}>
      <QueryFeedback query={dashboard.meetings} label="meetings" />
      {!dashboard.upcoming.length && dashboard.meetings.isSuccess && (
        <EmptyState>No upcoming meetings. Your schedule is clear.</EmptyState>
      )}
      <ul className="space-y-3">
        {dashboard.upcoming.map((meeting, index) => (
          <MeetingItem
            key={meeting.id}
            meeting={meeting}
            zone={dashboard.zone}
            now={dashboard.now}
            highlighted={index === 0 || meeting.status === "LIVE"}
          />
        ))}
      </ul>
    </DashboardPanel>
  );
}
