import Link from "next/link";
import { CalendarDays, ListChecks, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { useDashboard } from "../hooks/use-dashboard";
import { formatTime } from "../utils/dashboard.utils";
import { DashboardPanel, EmptyState, QueryFeedback } from "./dashboard-panel";

const DAY_KINDS = {
  Event: { icon: CalendarDays, tone: "bg-info-soft text-info-content" },
  Task: { icon: ListChecks, tone: "bg-warning-soft text-warning-content" },
  Meeting: { icon: Video, tone: "bg-success-soft text-success-content" },
};

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
      <ul className="border-l border-border pl-3">
        {dayItems.map((entry) => {
          const { icon: Icon, tone } = DAY_KINDS[entry.kind];
          const isNext = entry.key === nextItemKey;
          return (
            <li key={entry.key}>
              <Link href={entry.href} className={`relative flex min-w-0 cursor-pointer items-center gap-3 rounded-control border-b border-border py-4 pr-2 before:absolute before:-left-[17px] before:h-2 before:w-2 before:rounded-full before:bg-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150 ${isNext ? "bg-primary-soft hover:bg-accent" : "hover:bg-muted"}`}>
                <time dateTime={entry.at} className={`w-16 shrink-0 text-xs font-medium tabular-nums ${isNext ? "text-primary-soft-foreground" : "text-muted-foreground"}`}>
                  {entry.allDay ? "All day" : formatTime(entry.at, zone)}
                </time>
                <span className={`grid size-8 shrink-0 place-items-center rounded-control ${tone}`}>
                  <Icon aria-hidden size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">{entry.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={`text-xs ${isNext ? "text-primary-soft-foreground" : "text-muted-foreground"}`}>
                      {entry.kind}{entry.kind === "Task" ? " · Due today" : ""}
                    </span>
                    {isNext && <Badge>Up next</Badge>}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </DashboardPanel>
  );
}
