"use client";

import { useMeetingHistorySummary } from "../hooks/useMeetingHistory";
import { formatMeetingSummaryLastMeetingAt, formatMeetingSummaryMinutes } from "../utils/meeting-summary.utils";

const zeroSummary = { totalMeetings: 0, liveMeetings: 0, endedMeetings: 0, hostedMeetings: 0, totalMinutes: 0, lastMeetingAt: null };

export function MeetingSidebarStatsPanel() {
  const summaryQuery = useMeetingHistorySummary();
  const summary = summaryQuery.data?.data ?? zeroSummary;
  const lastMeetingLabel = formatMeetingSummaryLastMeetingAt(summary.lastMeetingAt, "Never");
  return <section className="mt-auto hidden border-t border-border pt-5 @min-[1120px]/meetings:block" aria-label="Meeting statistics">
    <h2 className="text-sm font-semibold text-foreground">Meeting stats</h2>
    {summaryQuery.isLoading ? <p role="status" className="mt-3 text-xs text-muted-foreground">Loading meeting stats...</p> : summaryQuery.isError ? <p role="alert" className="mt-3 text-xs text-destructive-content">Could not load meeting stats.</p> : <dl className="mt-3 space-y-2.5 text-xs text-foreground">
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Total meetings</dt><dd className="font-medium tabular-nums">{summary.totalMeetings}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Live</dt><dd className="font-medium tabular-nums">{summary.liveMeetings}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Ended</dt><dd className="font-medium tabular-nums">{summary.endedMeetings}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Hosted</dt><dd className="font-medium tabular-nums">{summary.hostedMeetings}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Total time</dt><dd className="font-medium tabular-nums">{formatMeetingSummaryMinutes(summary.totalMinutes)}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Last meeting</dt><dd className="text-right font-medium">{lastMeetingLabel}</dd></div>
    </dl>}
  </section>;
}
