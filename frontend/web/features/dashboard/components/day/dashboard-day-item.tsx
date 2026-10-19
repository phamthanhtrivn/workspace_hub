import Link from "next/link";
import { ArrowUpRight, CalendarDays, ListChecks, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayItem } from "../../types/dashboard.types";
import { formatTime } from "../../utils/dashboard.utils";

const DAY_KINDS = {
  Event: { icon: CalendarDays, tone: "bg-info-soft text-info-content" },
  Task: { icon: ListChecks, tone: "bg-warning-soft text-warning-content" },
  Meeting: { icon: Video, tone: "bg-success-soft text-success-content" },
};

interface DashboardDayItemProps {
  entry: DayItem;
  zone: string;
  isNext: boolean;
}

export function DashboardDayItem({ entry, zone, isNext }: DashboardDayItemProps) {
  const { icon: Icon, tone } = DAY_KINDS[entry.kind];

  return (
    <li className="min-w-0 border-b border-border last:border-b-0">
      <Button
        asChild
        variant="ghost"
        className={cn(
          "group grid h-auto min-h-16 w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_1rem] items-start gap-x-3 gap-y-2 whitespace-normal rounded-control px-3 py-3 text-left font-normal active:bg-accent focus-visible:ring-inset motion-reduce:transition-none sm:grid-cols-[2rem_minmax(0,1fr)_auto_1rem] sm:items-center",
          isNext ? "bg-primary-soft hover:bg-accent" : "hover:bg-muted",
        )}
      >
        <Link href={entry.href}>
          <span className={cn("col-start-1 row-span-2 row-start-1 grid size-8 shrink-0 place-items-center rounded-control sm:row-span-1", tone)}>
            <Icon aria-hidden="true" />
          </span>
          <span className="col-start-2 row-start-1 min-w-0">
            <span className="line-clamp-2 break-words text-sm font-medium text-foreground group-hover:text-link [overflow-wrap:anywhere]">
              {entry.title}
            </span>
            <span className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className={cn("text-xs", isNext ? "text-primary-soft-foreground" : "text-muted-foreground")}>
                {entry.kind}{entry.kind === "Task" ? " · Due today" : ""}
              </span>
              {isNext && <Badge className="font-medium">Up next</Badge>}
            </span>
          </span>
          <Badge variant="secondary" className="col-start-2 row-start-2 max-w-full justify-self-start whitespace-normal break-words font-medium sm:col-start-3 sm:row-start-1">
            <time dateTime={entry.at} className="tabular-nums">
              {entry.allDay ? "All day" : formatTime(entry.at, zone)}
            </time>
          </Badge>
          <ArrowUpRight
            aria-hidden="true"
            className="col-start-3 row-span-2 row-start-1 self-center text-muted-foreground group-hover:text-link group-focus-visible:text-link sm:col-start-4 sm:row-span-1"
          />
        </Link>
      </Button>
    </li>
  );
}
