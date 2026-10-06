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
    <li className="border-b border-[var(--border)] pb-4">
      <p className="truncate text-sm font-semibold text-slate-800">
        {meeting.title}
      </p>
      <p className="mt-1 text-xs text-slate-500">
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
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Users size={13} />
          {meeting.participantCount} participants
        </span>
        <Link
          href={`/meetings/${encodeURIComponent(meeting.joinToken)}`}
          className="flex items-center gap-1 rounded-md bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
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
