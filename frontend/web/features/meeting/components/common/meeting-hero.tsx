"use client";

import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";


interface MeetingHeroProps {
  dateLabel: string;
  timeLabel: string;
  upcomingMeetingCount?: number;
  onUpcomingClick: () => void;
}

export function MeetingHero({ dateLabel, timeLabel, upcomingMeetingCount, onUpcomingClick }: MeetingHeroProps) {
  return (
    <section className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-page-title font-semibold text-foreground">Meetings</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{dateLabel}</span>
          <span aria-hidden>·</span>
          <span className="font-medium tabular-nums text-foreground">{timeLabel}</span>
        </p>
      </div>
      <Button variant="unstyled" type="button" onClick={onUpcomingClick} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-control border border-input bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <Clock3 className="size-4" aria-hidden />
        {upcomingMeetingCount === undefined
          ? "View upcoming meetings"
          : `${upcomingMeetingCount} upcoming ${upcomingMeetingCount === 1 ? "meeting" : "meetings"}`}
      </Button>
    </section>
  );
}
