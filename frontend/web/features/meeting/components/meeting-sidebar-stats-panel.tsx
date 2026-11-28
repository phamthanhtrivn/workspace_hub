"use client";

import {
  CalendarDays,
  Clock3,
  RefreshCw,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMeetingHistorySummary } from "../hooks/useMeetingHistory";
import type { MeetingHistorySummaryResponse } from "../types/meeting.types";
import {
  formatMeetingSummaryLastMeetingAt,
  formatMeetingSummaryMinutes,
} from "../utils/meeting-summary.utils";
import { LoadingState } from "@/components/ui/loading-state";

function MeetingStatsSkeleton() {
  return (
    <div role="status" aria-label="Loading meeting stats" className="mt-4">
      <LoadingState label="Loading meeting stats..." className="sr-only" />
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

function MeetingStatsSummary({
  summary,
}: {
  summary: MeetingHistorySummaryResponse;
}) {
  const details = [
    { label: "Hosted", icon: UserRound, value: summary.hostedMeetings },
    {
      label: "Total time",
      icon: Clock3,
      value: formatMeetingSummaryMinutes(summary.totalMinutes),
    },
    {
      label: "Last meeting",
      icon: CalendarDays,
      value: formatMeetingSummaryLastMeetingAt(summary.lastMeetingAt, "Never"),
    },
  ];

  return (
    <>
      <dl className="mt-3">
        <dt className="text-[11px] font-medium text-muted-foreground">
          Total meetings
        </dt>
        <dd className="mt-0.5 break-words text-2xl font-bold leading-8 tracking-tight text-foreground tabular-nums [overflow-wrap:anywhere]">
          {summary.totalMeetings}
        </dd>
      </dl>
      <div className="mt-3 flex min-w-0 flex-wrap gap-2">
        <Badge
          variant="secondary"
          className="max-w-full gap-1.5 whitespace-normal border border-success/25 bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success-content"
        >
          {summary.liveMeetings > 0 && (
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
          )}
          Live{" "}
          <span className="min-w-0 tabular-nums [overflow-wrap:anywhere]">
            {summary.liveMeetings}
          </span>
        </Badge>
        <Badge
          variant="secondary"
          className="max-w-full whitespace-normal border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
        >
          Ended{" "}
          <span className="min-w-0 tabular-nums [overflow-wrap:anywhere]">
            {summary.endedMeetings}
          </span>
        </Badge>
      </div>
      <dl className="mt-3 space-y-2 border-t border-border pt-2.5 text-xs">
        {details.map(({ label, icon: Icon, value }) => (
          <div
            key={label}
            className="flex min-w-0 items-center justify-between gap-3"
          >
            <dt className="flex shrink-0 items-center gap-2 text-muted-foreground">
              <Icon aria-hidden="true" className="size-3.5 shrink-0" />
              {label}
            </dt>
            <dd className="min-w-0 break-words text-right font-bold text-foreground tabular-nums [overflow-wrap:anywhere]">
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
    <section
      className="mt-auto hidden min-w-0 shrink-0 rounded-panel border border-border bg-card p-3.5 @min-[1120px]/meetings:block"
      aria-label="Meeting statistics"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-bold text-foreground">Meeting stats</h2>
        <TrendingUp
          aria-hidden="true"
          className="size-4 shrink-0 text-info-content"
        />
      </div>
      {summaryQuery.isPending ? (
        <MeetingStatsSkeleton />
      ) : summaryQuery.isError || !summary ? (
        <div className="mt-4 space-y-3">
          <p
            role="alert"
            className="text-xs leading-5 text-destructive-content"
          >
            Could not load meeting stats.
          </p>
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
