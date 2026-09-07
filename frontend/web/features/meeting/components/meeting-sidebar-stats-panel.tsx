"use client";

import type { ComponentType } from "react";
import {
  BarChart3,
  Clock3,
  Radio,
  ShieldCheck,
  UsersRound,
  Video,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { useMeetingHistorySummary } from "../hooks/useMeetingHistory";
import {
  formatMeetingSummaryAverageParticipants,
  formatMeetingSummaryMinutes,
} from "../utils/meeting-summary.utils";

const zeroSummary = {
  totalMeetings: 0,
  liveMeetings: 0,
  endedMeetings: 0,
  hostedMeetings: 0,
  totalMinutes: 0,
  averageParticipants: 0,
  lastMeetingAt: null,
};

function MeetingSidebarStatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-28 rounded-md bg-slate-200" />
      <div className="h-16 rounded-md bg-slate-200" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-14 rounded-md bg-slate-200" />
        <div className="h-14 rounded-md bg-slate-200" />
        <div className="h-14 rounded-md bg-slate-200" />
      </div>
    </div>
  );
}

interface MeetingSidebarMetricProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  tone?: "blue" | "emerald" | "slate";
}

function MeetingSidebarMetric({
  icon: Icon,
  label,
  value,
  tone = "slate",
}: MeetingSidebarMetricProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-2">
      <div
        className={cn(
          "grid h-7 w-7 place-items-center rounded-md",
          tone === "blue" && "bg-blue-50 text-[#0052CC]",
          tone === "emerald" && "bg-emerald-50 text-emerald-700",
          tone === "slate" && "bg-slate-100 text-slate-600",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-2 text-base font-black leading-none text-[#172B4D]">
        {value}
      </p>
      <p className="mt-1 truncate text-[0.68rem] font-bold text-slate-500">
        {label}
      </p>
    </div>
  );
}

export function MeetingSidebarStatsPanel() {
  const intl = useAppIntl();
  const summaryQuery = useMeetingHistorySummary();
  const summary = summaryQuery.data?.data ?? zeroSummary;
  const isEmpty = !summaryQuery.isLoading && summary.totalMeetings === 0;

  return (
    <section className="mt-auto hidden rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm xl:block">
      {summaryQuery.isLoading ? (
        <MeetingSidebarStatsSkeleton />
      ) : summaryQuery.isError ? (
        <div className="rounded-md border border-dashed border-red-200 bg-white px-3 py-4 text-sm font-bold text-red-600">
          {intl.formatMessage({ id: "meeting.stats.error" })}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-normal text-slate-500">
                {intl.formatMessage({ id: "meeting.stats.title" })}
              </p>
              <p className="mt-1 text-3xl font-black leading-none text-[#172B4D]">
                {summary.totalMeetings}
              </p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-md bg-[#0052CC] text-white shadow-[0_12px_24px_rgba(0,82,204,0.18)]">
              <BarChart3 className="h-5 w-5" />
            </div>
          </div>

          <p className="text-xs font-bold leading-5 text-slate-500">
            {isEmpty
              ? intl.formatMessage({ id: "meeting.stats.empty" })
              : intl.formatMessage(
                  { id: "meeting.stats.totalMeetings" },
                  { count: summary.totalMeetings },
                )}
          </p>

          <div className="grid grid-cols-3 gap-2">
            <MeetingSidebarMetric
              icon={Radio}
              label={intl.formatMessage({ id: "meeting.stats.live" })}
              value={summary.liveMeetings}
              tone="emerald"
            />
            <MeetingSidebarMetric
              icon={Video}
              label={intl.formatMessage({ id: "meeting.stats.ended" })}
              value={summary.endedMeetings}
              tone="slate"
            />
            <MeetingSidebarMetric
              icon={ShieldCheck}
              label={intl.formatMessage({ id: "meeting.stats.hosted" })}
              value={summary.hostedMeetings}
              tone="blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                <span className="truncate text-[0.68rem] font-bold">
                  {intl.formatMessage({ id: "meeting.stats.totalTime" })}
                </span>
              </div>
              <p className="mt-1 text-sm font-black text-[#172B4D]">
                {formatMeetingSummaryMinutes(summary.totalMinutes)}
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-slate-500">
                <UsersRound className="h-3.5 w-3.5" />
                <span className="truncate text-[0.68rem] font-bold">
                  {intl.formatMessage({ id: "meeting.stats.avgParticipants" })}
                </span>
              </div>
              <p className="mt-1 text-sm font-black text-[#172B4D]">
                {formatMeetingSummaryAverageParticipants(
                  summary.averageParticipants,
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
