"use client";

import { CalendarDays, Clock3, RefreshCw, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeetingHistorySummary } from "../hooks/useMeetingHistory";
import type { MeetingHistorySummaryResponse } from "../types/meeting.types";
import { formatMeetingSummaryLastMeetingAt, formatMeetingSummaryMinutes } from "../utils/meeting-summary.utils";

function MeetingStatsSkeleton() {
  return (
    <div role="status" aria-label="Loading meeting stats" className="mt-4">
      <span className="sr-only">Loading meeting stats...</span>
      <div aria-hidden="true">
        <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
        <Skeleton className="mt-1 h-9 w-20 motion-reduce:animate-none" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-16 motion-reduce:animate-none" />
          <Skeleton className="h-6 w-20 motion-reduce:animate-none" />
        </div>
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {["hosted", "total-time", "last-meeting"].map((stat) => (
            <div key={stat} className="flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-24 motion-reduce:animate-none" />
              <Skeleton className="h-4 w-14 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeetingStatsSummary({ summary }: { summary: MeetingHistorySummaryResponse }) {
  const details = [
    { label: "Hosted", icon: UserRound, value: summary.hostedMeetings },
    { label: "Total time", icon: Clock3, value: formatMeetingSummaryMinutes(summary.totalMinutes) },
    { label: "Last meeting", icon: CalendarDays, value: formatMeetingSummaryLastMeetingAt(summary.lastMeetingAt, "Never") },
  ];

  return (
    <>
      <dl className="mt-4">
        <dt className="text-xs text-muted-foreground">Total meetings</dt>
        <dd className="mt-1 break-words text-3xl font-semibold leading-9 text-foreground tabular-nums [overflow-wrap:anywhere]">
          {summary.totalMeetings}
        </dd>
      </dl>
      <div className="mt-3 flex min-w-0 flex-wrap gap-2">
        <Badge variant="secondary" className="max-w-full whitespace-normal bg-success-soft font-medium text-success-content">
          Live <span className="min-w-0 font-semibold tabular-nums [overflow-wrap:anywhere]">{summary.liveMeetings}</span>
        </Badge>
        <Badge variant="secondary" className="max-w-full whitespace-normal font-medium">
          Ended <span className="min-w-0 font-semibold tabular-nums [overflow-wrap:anywhere]">{summary.endedMeetings}</span>
        </Badge>
      </div>
      <dl className="mt-4 space-y-3 border-t border-border pt-4 text-xs">
        {details.map(({ label, icon: Icon, value }) => (
          <div key={label} className="flex min-w-0 items-center justify-between gap-3">
            <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {label}
            </dt>
            <dd className="min-w-0 break-words text-right font-medium text-foreground tabular-nums [overflow-wrap:anywhere]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export function MeetingSidebarStatsPanel() {
  const summaryQuery = useMeetingHistorySummary();
  const summary = summaryQuery.data?.data;

  return (
    <section className="mt-auto hidden min-w-0 shrink-0 rounded-panel border border-border bg-card p-4 @min-[1120px]/meetings:block" aria-label="Meeting statistics">
      <h2 className="text-sm font-semibold text-foreground">Meeting stats</h2>
      {summaryQuery.isPending ? (
        <MeetingStatsSkeleton />
      ) : summaryQuery.isError || !summary ? (
        <div className="mt-4 space-y-3">
          <p role="alert" className="text-xs leading-5 text-destructive-content">Could not load meeting stats.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={summaryQuery.isFetching}
            onClick={() => void summaryQuery.refetch()}
            className="max-w-full whitespace-normal motion-reduce:transition-none"
          >
            <RefreshCw aria-hidden="true" />
            {summaryQuery.isFetching ? "Retrying..." : "Retry"}
          </Button>
        </div>
      ) : (
        <MeetingStatsSummary summary={summary} />
      )}
    </section>
  );
}
