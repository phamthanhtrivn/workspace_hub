"use client";

import type { ComponentType } from "react";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  Radio,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { cn } from "@/lib/utils";
import { useMeetingHistorySummary } from "../hooks/useMeetingHistory";
import {
  formatMeetingSummaryLastMeetingAt,
  formatMeetingSummaryMinutes,
} from "../utils/meeting-summary.utils";

const zeroSummary = {
  totalMeetings: 0,
  liveMeetings: 0,
  endedMeetings: 0,
  hostedMeetings: 0,
  totalMinutes: 0,
  lastMeetingAt: null,
};

function MeetingSidebarStatsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-slate-100 p-4">
        <div className="h-4 w-24 rounded-md bg-slate-200" />
        <div className="mt-4 h-9 w-16 rounded-md bg-slate-200" />
        <div className="mt-3 h-3 w-36 rounded-md bg-slate-200" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <div className="h-16 rounded-md bg-slate-100" />
        <div className="h-16 rounded-md bg-slate-100" />
        <div className="h-16 rounded-md bg-slate-100" />
      </div>
      <div className="rounded-md border border-slate-200 bg-white">
        <div className="h-11 border-b border-slate-100" />
        <div className="h-11" />
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
    <div className="min-w-0 rounded-md border border-slate-200 bg-white p-2.5 shadow-[0_8px_18px_rgba(15,40,84,0.04)]">
      <div
        className={cn(
          "grid h-7 w-7 place-items-center rounded-md ring-1",
          tone === "blue" && "bg-blue-50 text-[#0052CC] ring-blue-100",
          tone === "emerald" &&
            "bg-emerald-50 text-emerald-700 ring-emerald-100",
          tone === "slate" && "bg-slate-100 text-slate-600 ring-slate-200",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-2 text-base font-black leading-none text-[#172B4D]">
        {value}
      </p>
      <p className="mt-1 truncate text-[0.68rem] font-bold leading-none text-slate-500">
        {label}
      </p>
    </div>
  );
}

interface MeetingSidebarStatsRowProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function MeetingSidebarStatsRow({
  icon: Icon,
  label,
  value,
}: MeetingSidebarStatsRowProps) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate text-xs font-bold">{label}</span>
      </div>
      <span className="min-w-0 truncate text-right text-sm font-black text-[#172B4D]">
        {value}
      </span>
    </div>
  );
}

export function MeetingSidebarStatsPanel() {
  const intl = useAppIntl();
  const summaryQuery = useMeetingHistorySummary();
  const summary = summaryQuery.data?.data ?? zeroSummary;
  const isEmpty = !summaryQuery.isLoading && summary.totalMeetings === 0;
  const lastMeetingLabel = formatMeetingSummaryLastMeetingAt(
    summary.lastMeetingAt,
    intl.locale,
    intl.formatMessage({ id: "meeting.stats.never" }),
  );

  return (
    <section className="mt-auto hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_38px_rgba(15,40,84,0.08)] xl:block">
      {summaryQuery.isLoading ? (
        <div className="p-3">
          <MeetingSidebarStatsSkeleton />
        </div>
      ) : summaryQuery.isError ? (
        <div className="m-3 rounded-md border border-dashed border-red-200 bg-red-50 px-3 py-4 text-sm font-bold text-red-600">
          {intl.formatMessage({ id: "meeting.stats.error" })}
        </div>
      ) : (
        <div>
          <div className="bg-[#172B4D] p-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-blue-100">
                  {intl.formatMessage({ id: "meeting.stats.title" })}
                </p>
                <p className="mt-3 text-4xl font-black leading-none">
                  {summary.totalMeetings}
                </p>
              </div>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-white/14 text-white ring-1 ring-white/18">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>

            <p className="mt-3 text-xs font-bold leading-5 text-blue-100">
              {isEmpty
                ? intl.formatMessage({ id: "meeting.stats.empty" })
                : intl.formatMessage(
                    { id: "meeting.stats.totalMeetings" },
                    { count: summary.totalMeetings },
                  )}
            </p>
          </div>

          <div className="space-y-3 bg-slate-50 p-3">
            <div className="grid grid-cols-3 gap-1.5">
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

            <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white shadow-[0_8px_18px_rgba(15,40,84,0.04)]">
              <MeetingSidebarStatsRow
                icon={Clock3}
                label={intl.formatMessage({ id: "meeting.stats.totalTime" })}
                value={formatMeetingSummaryMinutes(summary.totalMinutes)}
              />
              <MeetingSidebarStatsRow
                icon={CalendarDays}
                label={intl.formatMessage({ id: "meeting.stats.lastMeeting" })}
                value={lastMeetingLabel}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
