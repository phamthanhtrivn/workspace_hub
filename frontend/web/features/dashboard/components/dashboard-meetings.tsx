import Link from "next/link";
import { Users, Video } from "lucide-react";
import type { UpcomingMeetingItem } from "@/features/meeting/types/meeting.types";
import { DashboardPanel, EmptyState, QueryFeedback } from "./dashboard-panel";
import { formatTime } from "../utils/dashboard.utils";
import type { useDashboard } from "../hooks/use-dashboard";

function MeetingItem({
  meeting,
  zone,
}: {
  meeting: UpcomingMeetingItem;
  zone: string;
}) {
  return (
    <li className="border-b border-border pb-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 basis-32 line-clamp-2 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
          {meeting.title}
        </p>
        {meeting.status === "LIVE" && (
          <span className="shrink-0 rounded-control bg-success-soft px-2 py-1 text-xs font-medium text-success-content">
            Live now
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
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
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users size={13} />
          {meeting.participantCount} participants
        </span>
        <Link
          href={`/meetings/${encodeURIComponent(meeting.joinToken)}`}
          aria-label={`View meeting: ${meeting.title}`}
          className="flex min-h-11 cursor-pointer items-center gap-1 rounded-control bg-secondary px-3 py-1.5 text-xs font-medium text-link hover:bg-accent sm:min-h-8 [@media(pointer:coarse)]:min-h-11"
        >
          <Video size={13} />
          View meeting
        </Link>
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
    <DashboardPanel title="Upcoming meetings" href="/meetings?tab=upcoming">
      <QueryFeedback query={dashboard.meetings} label="meetings" />
      {!dashboard.upcoming.length && dashboard.meetings.isSuccess && (
        <EmptyState>No upcoming meetings. Your schedule is clear.</EmptyState>
      )}
      <ul className="space-y-3">
        {dashboard.upcoming.map((meeting) => (
          <MeetingItem
            key={meeting.id}
            meeting={meeting}
            zone={dashboard.zone}
          />
        ))}
      </ul>
    </DashboardPanel>
  );
}
