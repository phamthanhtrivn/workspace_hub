"use client";

import { Clock3 } from "lucide-react";

interface MeetingHeroProps {
  dateLabel: string;
  timeLabel: string;
  upcomingMeetingCount: number;
  onUpcomingClick: () => void;
}

export function MeetingHero({ dateLabel, timeLabel, upcomingMeetingCount, onUpcomingClick }: MeetingHeroProps) {
  return (
    <section className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="text-page-title font-semibold text-foreground">Meetings</h1>
        <p className="mt-2 text-sm text-muted-foreground">{dateLabel} <span aria-hidden>·</span> {timeLabel}</p>
      </div>
      <button type="button" onClick={onUpcomingClick} className="inline-flex min-h-9 items-center gap-2 rounded-control border border-input bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Clock3 className="size-4" aria-hidden />{upcomingMeetingCount} upcoming {upcomingMeetingCount === 1 ? "meeting" : "meetings"}
      </button>
    </section>
  );
}
