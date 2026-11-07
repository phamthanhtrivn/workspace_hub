"use client";

import { useId, useMemo, useState } from "react";
import { ChartNoAxesCombined, History, RotateCcw, SlidersHorizontal, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePomodoroReport } from "../hooks/use-pomodoro-report";
import { usePomodoroReportRange } from "../hooks/use-pomodoro-report-range";
import {
  POMODORO_REPORT_COPY as copy, POMODORO_REPORT_DEFAULT_FILTERS, POMODORO_REPORT_DEFAULTS as defaults,
  POMODORO_REPORT_PAGE_SIZE, POMODORO_REPORT_PRESETS, POMODORO_REPORT_TABS as tabs, type PomodoroReportTab,
} from "../constants/pomodoro-report";
import { getPomodoroPagination } from "../utils/pomodoro-pagination";
import { buildPomodoroReport, getPomodoroReportDays } from "../utils/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { PomodoroDailyStats } from "./pomodoro-daily-stats";
import { PomodoroSessionHistory } from "./pomodoro-session-history";
import { PomodoroReportSummary } from "./pomodoro-report-summary";
import { PomodoroPanelHeader } from "./pomodoro-panel-header";
import { PomodoroReportToolbar } from "./pomodoro-report-toolbar";
import { PomodoroReportChart } from "./pomodoro-report-chart";

const EMPTY_SESSIONS: PomodoroSessionRecord[] = [];

export function PomodoroReport({ lastUpdated }: { lastUpdated: number }) {
  const id = useId();
  const dates = usePomodoroReportRange();
  const range = dates.applied;
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<PomodoroReportTab>(defaults.tab);
  const [hideEmptyDays, setHideEmptyDays] = useState<boolean>(defaults.hideEmptyDays);
  const [dailyPage, setDailyPage] = useState<number>(defaults.page);
  const [sessionPage, setSessionPage] = useState<number>(defaults.page);
  const query = usePomodoroReport(range, lastUpdated, dates.today, dates.timeZone);
  const sessions = query.data ?? EMPTY_SESSIONS;
  const report = useMemo(() => query.validationError ? null : buildPomodoroReport(sessions, range, POMODORO_REPORT_DEFAULT_FILTERS, new Date(), dates.timeZone),
    [sessions, range, query.validationError, dates.timeZone]);
  const ready = !query.validationError && !query.isPending && !query.isError;
  const visibleDays = getPomodoroReportDays(report?.daily ?? [], hideEmptyDays);
  const dailyPagination = getPomodoroPagination(visibleDays.length, dailyPage, POMODORO_REPORT_PAGE_SIZE);
  const sessionPagination = getPomodoroPagination(report?.sessions.length ?? 0, sessionPage, POMODORO_REPORT_PAGE_SIZE);
  const contextKey = `${dates.timeZone}/${range.startDate}/${range.endDate}`;
  const [previousContext, setPreviousContext] = useState(contextKey);

  if (previousContext !== contextKey) {
    setPreviousContext(contextKey);
    setDailyPage(defaults.page);
    setSessionPage(defaults.page);
  } else {
    // Clamp pages after a refresh without discarding the current page while loading.
    if (ready && dailyPage !== dailyPagination.currentPage) setDailyPage(dailyPagination.currentPage);
    if (ready && sessionPage !== sessionPagination.currentPage) setSessionPage(sessionPagination.currentPage);
  }

  const resetPages = () => { setDailyPage(defaults.page); setSessionPage(defaults.page); };
  const resetFilters = () => {
    dates.reset();
    setActiveTab(defaults.tab);
    setHideEmptyDays(defaults.hideEmptyDays);
    resetPages();
  };
  const hasResettableChanges = dates.preset !== defaults.preset || dates.dirty || hideEmptyDays !== defaults.hideEmptyDays ||
    activeTab !== defaults.tab || dailyPage !== defaults.page || sessionPage !== defaults.page;

  return <section aria-label="Pomodoro history and reports">
    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}
      render={<Card className="block min-w-0 overflow-hidden rounded-panel border-border bg-card p-0 text-foreground shadow-none" />}>
      <PomodoroPanelHeader title={copy.title} description={copy.description} icon={ChartNoAxesCombined}
        action={<div className="ml-auto flex w-full min-w-0 flex-wrap items-center justify-end gap-2 @min-[800px]/pomodoro:w-auto">
        <div className="grid w-full min-w-0 grid-cols-3 gap-1 rounded-control bg-muted p-1 @min-[480px]/pomodoro:w-auto" role="group" aria-label={copy.dateRanges}>
          {POMODORO_REPORT_PRESETS.map(({ value: preset, label }) => {
            const selected = dates.preset === preset;
            return <Button key={preset} type="button" size="sm" variant="ghost" aria-pressed={selected}
              className={cn("h-9 min-w-0 rounded-control border border-transparent px-2 py-0 text-xs focus-visible:ring-inset @min-[480px]/pomodoro:px-3",
                selected ? "border-border bg-card font-semibold text-foreground hover:bg-card" : "text-muted-foreground hover:bg-accent hover:text-foreground")}
              onClick={() => { dates.choosePreset(preset); resetPages(); }}>{label}</Button>;
          })}
        </div>
        <Button type="button" variant="outline" size="icon-sm" className="size-9" disabled={!hasResettableChanges}
          aria-label={copy.resetFilters} title={copy.resetFilters} onClick={resetFilters}>
          <RotateCcw aria-hidden="true" className="size-4" />
        </Button>
        <CollapsibleTrigger render={<Button type="button" variant={filtersOpen ? "secondary" : "outline"} size="sm" className="h-9 gap-2" />} aria-label={copy.filterControls}>
          <SlidersHorizontal aria-hidden="true" className="size-4" />{copy.filters}
        </CollapsibleTrigger>
        </div>} />
      <PomodoroReportToolbar id={id} dates={dates} updating={query.isFetching && !query.isPending && !query.isError}
        onApplyDates={() => { dates.apply(); resetPages(); }} />
      <div className="px-4 pb-5 sm:px-5">
        {query.validationError ? <p id={`${id}-error`} role="alert" className="py-5 text-sm text-destructive-content">{query.validationError}</p>
          : query.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 py-5 text-sm text-destructive-content">{copy.loadFailed}<Button variant="outline" size="sm" type="button" onClick={() => void query.refetch()}>{copy.retry}</Button></div>
          : query.isPending ? <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground"><Spinner />{copy.loading}</p> : null}
        {ready && report && <>
          <PomodoroReportSummary summary={report.summary} />
          <PomodoroReportChart days={report.daily} />
          <Tabs value={activeTab} onValueChange={value => { if (value === tabs.history || value === tabs.daily) setActiveTab(value); }} className="min-w-0 gap-4 border-t border-border pt-4">
            <TabsList aria-label={copy.detailTabs} className="h-auto max-w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              <TabsTrigger value={tabs.history} className="h-10 gap-2 rounded-control px-3 font-medium data-[state=active]:bg-muted">
                <History aria-hidden="true" className="size-4" />{copy.sessionHistory}<span className="text-xs text-muted-foreground tabular-nums">{report.sessions.length}</span>
              </TabsTrigger>
              <TabsTrigger value={tabs.daily} className="h-10 gap-2 rounded-control px-3 font-medium data-[state=active]:bg-muted"><Table2 aria-hidden="true" className="size-4" />{copy.dailyStats}</TabsTrigger>
            </TabsList>
            <TabsContent value={tabs.history} forceMount className="min-w-0 data-[state=inactive]:hidden">
              <PomodoroSessionHistory embedded reportView timeZone={dates.timeZone}
                records={report.sessions.slice(sessionPagination.startIndex, sessionPagination.endIndex)}
                title={copy.sessionHistory} totalCount={report.sessions.length} showDates
                page={sessionPagination.currentPage} totalPages={sessionPagination.totalPages} onPageChange={setSessionPage} />
            </TabsContent>
            <TabsContent value={tabs.daily} forceMount className="min-w-0 data-[state=inactive]:hidden">
              <PomodoroDailyStats days={visibleDays.slice(dailyPagination.startIndex, dailyPagination.endIndex)}
                visibleDayCount={visibleDays.length} totalDays={report.daily.length} hideEmptyDays={hideEmptyDays}
                onHideEmptyDaysChange={hide => { setHideEmptyDays(hide); setDailyPage(defaults.page); }}
                page={dailyPagination.currentPage} totalPages={dailyPagination.totalPages} onPageChange={setDailyPage} />
            </TabsContent>
          </Tabs>
        </>}
      </div>
    </Collapsible>
  </section>;
}
