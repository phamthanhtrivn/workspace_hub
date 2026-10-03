"use client";

import { useId, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { SimplePagination } from "@/components/ui/custom/simple-pagination";
import { usePomodoroReport } from "../hooks/use-pomodoro-report";
import { POMODORO_REPORT_PAGE_SIZE } from "../constants/pomodoro-report";
import { getPomodoroPagination } from "../utils/pomodoro-pagination";
import { PomodoroDailyStats } from "./pomodoro-daily-stats";
import { PomodoroSessionHistory } from "./pomodoro-session-history";
import {
  buildPomodoroReport, createReportExport, formatFocusTime, presetReportRange, reportFilterOptions,
  type PomodoroReportFilters, type PomodoroReportPreset, type PomodoroReportRange,
} from "../utils/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";

const EMPTY_SESSIONS: PomodoroSessionRecord[] = [];
const INPUT_CLASS = "mt-1 inline-block h-auto w-full min-w-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-700 shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const PRESETS: [PomodoroReportPreset, string][] = [["today", "Today"], ["week", "This week"], ["month", "This month"]];

export function PomodoroReport({ lastUpdated }: { lastUpdated: number }) {
  const id = useId();
  const [range, setRange] = useState(() => presetReportRange("week"));
  const [filters, setFilters] = useState<PomodoroReportFilters>({ project: "", task: "" });
  const [dailyPage, setDailyPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const query = usePomodoroReport(range, lastUpdated);
  const sessions = query.data ?? EMPTY_SESSIONS;
  const options = useMemo(() => reportFilterOptions(sessions, filters.project), [sessions, filters.project]);
  const report = useMemo(() => query.validationError ? null : buildPomodoroReport(sessions, range, filters),
    [sessions, range, filters, query.validationError]);
  const ready = !query.validationError && !query.isPending && !query.isError;
  const dailyPagination = getPomodoroPagination(report?.daily.length ?? 0, dailyPage, POMODORO_REPORT_PAGE_SIZE);
  const sessionPagination = getPomodoroPagination(report?.sessions.length ?? 0, sessionPage, POMODORO_REPORT_PAGE_SIZE);

  // Keep stored pages valid after refreshed data shrinks, without resetting during loading.
  if (ready && dailyPage !== dailyPagination.currentPage) setDailyPage(dailyPagination.currentPage);
  if (ready && sessionPage !== sessionPagination.currentPage) setSessionPage(sessionPagination.currentPage);

  const resetPages = () => {
    setDailyPage(1);
    setSessionPage(1);
  };

  const changeRange = (next: PomodoroReportRange) => {
    setRange(next);
    setFilters({ project: "", task: "" });
    resetPages();
  };

  const exportReport = () => {
    if (!ready || query.isFetching || !report) return;
    try {
      const blob = new Blob([JSON.stringify(createReportExport(report, range, filters), null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pomodoro_${range.startDate}_${range.endDate}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("Unable to export the report. Please try again.");
    }
  };

  return (
    <section className="space-y-4" aria-label="Pomodoro history and reports">
      <Card className="block text-inherit rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900">History & reports</h3>
          <Button type="button" variant="outline" size="sm" disabled={!ready || query.isFetching} onClick={exportReport}>
            <Download aria-hidden="true" className="mr-1.5 size-3.5" /> Export JSON
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick date ranges">
          {PRESETS.map(([preset, label]) => {
            const value = presetReportRange(preset);
            const selected = value.startDate === range.startDate && value.endDate === range.endDate;
            return <Button key={preset} type="button" size="sm" variant={selected ? "default" : "outline"} aria-pressed={selected} onClick={() => changeRange(value)}>{label}</Button>;
          })}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label htmlFor={`${id}-start`} className="min-w-0 text-xs font-semibold text-slate-600">
            From date
            <Input id={`${id}-start`} type="date" value={range.startDate} onChange={(event) => changeRange({ ...range, startDate: event.target.value })} className={INPUT_CLASS} />
          </label>
          <label htmlFor={`${id}-end`} className="min-w-0 text-xs font-semibold text-slate-600">
            To date
            <Input id={`${id}-end`} type="date" value={range.endDate} onChange={(event) => changeRange({ ...range, endDate: event.target.value })} className={INPUT_CLASS} />
          </label>
          <label htmlFor={`${id}-project`} className="min-w-0 text-xs font-semibold text-slate-600">
            Project
            <CustomSelect
              id={`${id}-project`} value={filters.project} disabled={!ready} ariaLabel="Project"
              options={[{ value: "", label: "All projects / personal" }, ...options.projects.map(([value, label]) => ({ value, label }))]}
              className="mt-1" triggerClassName="h-auto px-2 py-2 text-xs font-normal shadow-none"
              onChange={(project) => { setFilters({ project, task: "" }); resetPages(); }}
            />
          </label>
          <label htmlFor={`${id}-task`} className="min-w-0 text-xs font-semibold text-slate-600">
            Task
            <CustomSelect
              id={`${id}-task`} value={filters.task} disabled={!ready} ariaLabel="Task"
              options={[{ value: "", label: "All tasks" }, ...options.tasks.map(([value, label]) => ({ value, label }))]}
              className="mt-1" triggerClassName="h-auto px-2 py-2 text-xs font-normal shadow-none"
              onChange={(task) => { setFilters({ ...filters, task }); resetPages(); }}
            />
          </label>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Up to 93 days. Sessions are counted by their start date in local time.</p>
        {query.validationError ? <p role="alert" className="mt-3 text-xs text-rose-600">{query.validationError}</p>
          : query.isError ? <div role="alert" className="mt-3 text-xs text-rose-600">Unable to load the report. <button type="button" className="underline" onClick={() => void query.refetch()}>Retry</button></div>
          : query.isPending ? <p role="status" className="mt-3 text-xs text-slate-500">Loading history...</p> : null}
        {ready && report && (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[
                ["Focus time", formatFocusTime(report.summary.focusSeconds)],
                ["Completed focus sessions", report.summary.completedFocusSessions],
                ["Stopped focus sessions", report.summary.stoppedFocusSessions],
                ["Total sessions", report.summary.totalSessions],
              ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-bold text-slate-900">{value}</dd></div>)}
            </dl>
            <PomodoroDailyStats
              days={report.daily.slice(dailyPagination.startIndex, dailyPagination.endIndex)}
              page={dailyPagination.currentPage} totalPages={dailyPagination.totalPages} onPageChange={setDailyPage}
            />
          </>
        )}
      </Card>
      {ready && report && (
        <>
          <PomodoroSessionHistory
            records={report.sessions.slice(sessionPagination.startIndex, sessionPagination.endIndex)}
            title="Session history" totalCount={report.sessions.length} showDates
            page={sessionPagination.currentPage}
          />
          {sessionPagination.totalPages > 1 && (
            <SimplePagination
              page={sessionPagination.currentPage} totalPages={sessionPagination.totalPages}
              onPageChange={setSessionPage} ariaLabel="Session history pagination"
            />
          )}
        </>
      )}
    </section>
  );
}
