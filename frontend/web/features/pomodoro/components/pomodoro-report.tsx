"use client";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChartNoAxesCombined, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePomodoroReport } from "../hooks/use-pomodoro-report";
import { usePomodoroReportRange } from "../hooks/use-pomodoro-report-range";
import { usePomodoroReportFilters } from "../hooks/use-pomodoro-report-filters";
import { POMODORO_REPORT_COPY as copy, POMODORO_REPORT_PAGE_SIZE, POMODORO_REPORT_PRESETS } from "../constants/pomodoro-report";
import { getPomodoroPagination } from "../utils/pomodoro-pagination";
import { PomodoroDailyStats } from "./pomodoro-daily-stats";
import { PomodoroSessionHistory } from "./pomodoro-session-history";
import { PomodoroReportDateFilters, PomodoroReportSessionFilters } from "./pomodoro-report-filters";
import { PomodoroReportSummary } from "./pomodoro-report-summary";
import {
  buildPomodoroReport, formatReportRange, getPomodoroReportDays,
} from "../utils/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { Spinner } from "@/components/ui/spinner";
import { PomodoroPanelHeader } from "./pomodoro-panel-header";

const EMPTY_SESSIONS: PomodoroSessionRecord[] = [];

export function PomodoroReport({ lastUpdated }: { lastUpdated: number }) {
  const id = useId();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dates = usePomodoroReportRange();
  const range = dates.applied;
  const [hideEmptyDays, setHideEmptyDays] = useState(false);
  const [dailyPage, setDailyPage] = useState(1);
  const [sessionPage, setSessionPage] = useState(1);
  const query = usePomodoroReport(range, lastUpdated, dates.today, dates.timeZone);
  const selection = usePomodoroReportFilters(query.data, query.isSuccess && !query.isFetching);
  const filters = selection.filters;
  const sessions = query.data ?? EMPTY_SESSIONS;
  const report = useMemo(() => query.validationError ? null : buildPomodoroReport(sessions, range, filters, new Date(), dates.timeZone),
    [sessions, range, filters, query.validationError, dates.timeZone]);
  const ready = !query.validationError && !query.isPending && !query.isError;
  const visibleDays = getPomodoroReportDays(report?.daily ?? [], hideEmptyDays);
  const dailyPagination = getPomodoroPagination(visibleDays.length, dailyPage, POMODORO_REPORT_PAGE_SIZE);
  const sessionPagination = getPomodoroPagination(report?.sessions.length ?? 0, sessionPage, POMODORO_REPORT_PAGE_SIZE);
  const contextKey = `${dates.timeZone}/${range.startDate}/${range.endDate}/${filters.source}/${filters.project}/${filters.task}`;
  const [previousContext, setPreviousContext] = useState(contextKey);

  if (previousContext !== contextKey) {
    setPreviousContext(contextKey);
    setDailyPage(1);
    setSessionPage(1);
  } else {
    // Keep pages valid after refreshed data shrinks, without resetting during loading.
    if (ready && dailyPage !== dailyPagination.currentPage) setDailyPage(dailyPagination.currentPage);
    if (ready && sessionPage !== sessionPagination.currentPage) setSessionPage(sessionPagination.currentPage);
  }

  const resetPages = () => {
    setDailyPage(1);
    setSessionPage(1);
  };

  return (
    <section aria-label="Pomodoro history and reports">
      <Card className="block min-w-0 overflow-hidden rounded-panel border-border bg-card p-0 text-foreground">
        <PomodoroPanelHeader title={copy.title} description={copy.description} icon={ChartNoAxesCombined}>
          <div className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-control bg-muted p-1" role="group" aria-label={copy.dateRanges}>
            {POMODORO_REPORT_PRESETS.map(({ value: preset, label }) => {
              const selected = dates.preset === preset;
              return <Button key={preset} type="button" size="sm" variant="ghost" aria-pressed={selected}
                className={cn("h-9 rounded-control border border-transparent px-3 py-0 text-xs focus-visible:ring-inset",
                  selected ? "border-border bg-card font-semibold text-foreground hover:bg-card" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
                onClick={() => { dates.choosePreset(preset); selection.clearNotice(); resetPages(); }}>{label}</Button>;
            })}
          </div>
        </PomodoroPanelHeader>
        <div className="px-4 pb-5 pt-4 sm:px-5">
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">{copy.appliedRange}: <span className="text-foreground">{formatReportRange(range)}</span></p>
              <CollapsibleTrigger render={<Button type="button" size="sm" variant="outline" className="group gap-2" />}>
                <SlidersHorizontal aria-hidden="true" className="size-3.5" />Filters<ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none" />
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
        <fieldset className="mt-4 min-w-0">
        <legend className="text-sm font-semibold text-foreground">{copy.dateRange}</legend>
        <PomodoroReportDateFilters id={id} range={dates.draft} today={dates.today}
          errors={dates.errors} onRangeChange={dates.setDraft} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={!dates.dirty || Object.keys(dates.errors).length > 0}
            onClick={() => { dates.apply(); selection.clearNotice(); resetPages(); }}>{copy.apply}</Button>
          <Button type="button" variant="ghost" size="sm" disabled={!dates.dirty} onClick={dates.cancel}>{copy.cancel}</Button>
          <p role="status" className="text-xs text-muted-foreground">{dates.dirty ? copy.unapplied : ""}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p id={`${id}-hint`} className="text-xs leading-relaxed text-muted-foreground">{copy.rangeHint}</p>
          {query.isFetching && !query.isPending && !query.isError && <p role="status" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner size={14} />{copy.updating}
          </p>}
        </div>
        </fieldset>
        <PomodoroReportSessionFilters id={id} filters={filters} options={selection.options}
          disabled={!ready || query.isFetching}
          onFiltersChange={next => { selection.changeFilters(next); resetPages(); }} />

            </CollapsibleContent>
          </Collapsible>
          {selection.notice && <p role="status" className="mt-2 text-xs text-muted-foreground">{selection.notice}</p>}
        {query.validationError ? <p id={`${id}-error`} role="alert" className="mt-3 text-xs text-destructive-content">{query.validationError}</p>
          : query.isError ? <div role="alert" className="mt-3 text-xs text-destructive-content">{copy.loadFailed} <Button variant="link" type="button" onClick={() => void query.refetch()}>{copy.retry}</Button></div>
          : query.isPending ? <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Spinner />{copy.loading}</p> : null}

          {ready && report && <>
            <PomodoroReportSummary summary={report.summary} />
            <PomodoroDailyStats days={visibleDays.slice(dailyPagination.startIndex, dailyPagination.endIndex)}
              visibleDayCount={visibleDays.length} totalDays={report.daily.length} hideEmptyDays={hideEmptyDays}
              onHideEmptyDaysChange={hide => { setHideEmptyDays(hide); setDailyPage(1); }}
              page={dailyPagination.currentPage} totalPages={dailyPagination.totalPages} onPageChange={setDailyPage} />
            <div className="mt-5 border-t border-border pt-5">
              <PomodoroSessionHistory embedded records={report.sessions.slice(sessionPagination.startIndex, sessionPagination.endIndex)}
                title="Session history" totalCount={report.sessions.length} showDates
                page={sessionPagination.currentPage} totalPages={sessionPagination.totalPages} onPageChange={setSessionPage} />
            </div>
          </>}
        </div>
      </Card>
    </section>
  );
}
