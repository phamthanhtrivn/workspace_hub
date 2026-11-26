"use client";

import { useId, useMemo, useState } from "react";
import {
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  History,
  RefreshCw,
  SlidersHorizontal,
  Table2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { usePomodoroReport } from "../hooks/use-pomodoro-report";
import { usePomodoroReportRange } from "../hooks/use-pomodoro-report-range";
import {
  POMODORO_REPORT_COPY as copy,
  POMODORO_REPORT_DEFAULT_FILTERS,
  POMODORO_REPORT_DEFAULTS as defaults,
  POMODORO_REPORT_PAGE_SIZE,
  POMODORO_REPORT_PRESETS,
  POMODORO_REPORT_TABS as tabs,
  type PomodoroReportTab,
} from "../constants/pomodoro-report";
import { getPomodoroPagination } from "../utils/pomodoro-pagination";
import {
  buildPomodoroReport,
  formatReportRange,
  getPomodoroReportDays,
  reportFilterOptions,
  type PomodoroReportStatusFilter,
  type PomodoroReportTypeFilter,
} from "../utils/pomodoro-report";
import type { PomodoroSessionRecord } from "../types/pomodoro";
import { PomodoroDailyStats } from "./pomodoro-daily-stats";
import { PomodoroSessionHistory } from "./pomodoro-session-history";
import { PomodoroReportSummary } from "./pomodoro-report-summary";
import { PomodoroPanelHeader } from "./pomodoro-panel-header";
import { PomodoroReportToolbar } from "./pomodoro-report-toolbar";
import { PomodoroReportChart } from "./pomodoro-report-chart";
import { PomodoroReportDateFilters } from "./pomodoro-report-filters";

const EMPTY_SESSIONS: PomodoroSessionRecord[] = [];

export function PomodoroReport({ lastUpdated }: { lastUpdated: number }) {
  const id = useId();
  const dates = usePomodoroReportRange();
  const range = dates.applied;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [sessionType, setSessionType] =
    useState<PomodoroReportTypeFilter>("all");
  const [statusFilter, setStatusFilter] =
    useState<PomodoroReportStatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"recent" | "longest">("recent");
  const [activeTab, setActiveTab] = useState<PomodoroReportTab>(defaults.tab);
  const [hideEmptyDays, setHideEmptyDays] = useState<boolean>(
    defaults.hideEmptyDays,
  );
  const [dailyPage, setDailyPage] = useState<number>(defaults.page);
  const [sessionPage, setSessionPage] = useState<number>(defaults.page);
  const query = usePomodoroReport(
    range,
    lastUpdated,
    dates.today,
    dates.timeZone,
  );
  const sessions = query.data ?? EMPTY_SESSIONS;
  const projectOptions = useMemo(
    () =>
      reportFilterOptions(sessions, { source: "all", project: "" }).projects,
    [sessions],
  );
  const report = useMemo(() => {
    if (query.validationError) return null;

    return buildPomodoroReport(
      sessions,
      range,
      {
        ...POMODORO_REPORT_DEFAULT_FILTERS,
        sessionType,
        status: statusFilter,
        project: projectFilter,
      },
      new Date(),
      dates.timeZone,
    );
  }, [
    sessions,
    range,
    query.validationError,
    dates.timeZone,
    sessionType,
    statusFilter,
    projectFilter,
  ]);
  const sortedSessions = useMemo(() => {
    const list = report?.sessions ?? [];
    if (sortOrder === "longest") {
      return [...list].sort((a, b) => b.actualSeconds - a.actualSeconds);
    }

    return list;
  }, [report?.sessions, sortOrder]);

  const ready = !query.validationError && !query.isPending && !query.isError;
  const visibleDays = getPomodoroReportDays(report?.daily ?? [], hideEmptyDays);
  const dailyPagination = getPomodoroPagination(
    visibleDays.length,
    dailyPage,
    POMODORO_REPORT_PAGE_SIZE,
  );
  const sessionPagination = getPomodoroPagination(
    sortedSessions.length,
    sessionPage,
    POMODORO_REPORT_PAGE_SIZE,
  );
  const contextKey = `${dates.timeZone}/${range.startDate}/${range.endDate}`;
  const [previousContext, setPreviousContext] = useState(contextKey);

  if (previousContext !== contextKey) {
    setPreviousContext(contextKey);
    setDailyPage(defaults.page);
    setSessionPage(defaults.page);
  } else {
    // Clamp pages after a refresh without discarding the current page while loading.
    if (ready && dailyPage !== dailyPagination.currentPage)
      setDailyPage(dailyPagination.currentPage);
    if (ready && sessionPage !== sessionPagination.currentPage)
      setSessionPage(sessionPagination.currentPage);
  }

  const resetPages = () => {
    setDailyPage(defaults.page);
    setSessionPage(defaults.page);
  };
  const resetSessionFilters = () => {
    setSessionType("all");
    setStatusFilter("all");
    setProjectFilter("");
    resetPages();
  };
  const activeFilterCount =
    (sessionType !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (projectFilter ? 1 : 0);

  return (
    <section aria-label="Pomodoro history and reports">
      <Collapsible
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        render={
          <Card className="block min-w-0 overflow-hidden rounded-panel border-border bg-card p-0 text-foreground shadow-none" />
        }
      >
        <PomodoroPanelHeader
          title={copy.title}
          description={copy.description}
          icon={ChartNoAxesCombined}
          action={
            <div className="ml-auto flex w-full min-w-0 flex-wrap items-center justify-end gap-2 @min-[800px]/pomodoro:w-auto">
              <div
                className="grid w-full min-w-0 grid-cols-3 gap-1 rounded-control bg-muted p-1 @min-[480px]/pomodoro:w-auto"
                role="group"
                aria-label={copy.dateRanges}
              >
                {POMODORO_REPORT_PRESETS.map(({ value: preset, label }) => {
                  const selected = dates.preset === preset;

                  return (
                    <Button
                      key={preset}
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-pressed={selected}
                      className={cn(
                        "h-8 min-w-0 rounded-control border border-transparent px-2 py-0 text-xs focus-visible:ring-inset @min-[480px]/pomodoro:px-3",
                        selected
                          ? "border-border bg-card font-semibold text-foreground hover:bg-card"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                      onClick={() => {
                        dates.choosePreset(preset);
                        resetPages();
                      }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>

              <Popover
                open={datePopoverOpen}
                onOpenChange={(open) => {
                  if (!open && dates.dirty) dates.cancel();
                  setDatePopoverOpen(open);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 gap-2 rounded-control px-3 text-xs font-semibold tabular-nums",
                      datePopoverOpen &&
                        "border-ring bg-info-soft text-info-content",
                    )}
                  >
                    <CalendarDays
                      aria-hidden="true"
                      className="size-3.5 text-link"
                    />
                    <span>{formatReportRange(dates.applied)}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-3.5 text-muted-foreground"
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  sideOffset={8}
                  className="w-80 max-w-[calc(100vw-2rem)] rounded-panel border border-border bg-card p-4 shadow-panel"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Custom Date Range
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close date range picker"
                      onClick={() => {
                        if (dates.dirty) dates.cancel();
                        setDatePopoverOpen(false);
                      }}
                      className="size-6 rounded text-muted-foreground"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                  <PomodoroReportDateFilters
                    id={id}
                    range={dates.draft}
                    today={dates.today}
                    errors={dates.errors}
                    onRangeChange={dates.setDraft}
                  />
                  <p
                    id={`${id}-hint`}
                    className="mt-3 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    {copy.rangeHint}
                  </p>
                  <div className="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        dates.cancel();
                        setDatePopoverOpen(false);
                      }}
                    >
                      {copy.cancel}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-xs"
                      disabled={
                        !dates.dirty || Object.keys(dates.errors).length > 0
                      }
                      onClick={() => {
                        dates.apply();
                        resetPages();
                        setDatePopoverOpen(false);
                      }}
                    >
                      {copy.apply}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-9 rounded-control"
                aria-label="Refresh metrics"
                title="Refresh metrics"
                onClick={() => void query.refetch()}
              >
                <RefreshCw
                  aria-hidden="true"
                  className={cn("size-4", query.isFetching && "animate-spin")}
                />
              </Button>

              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant={
                      filtersOpen || activeFilterCount > 0
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-9 gap-1.5 rounded-control"
                  />
                }
                aria-label={copy.filterControls}
              >
                <SlidersHorizontal aria-hidden="true" className="size-3.5" />
                {copy.filters}
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-card px-1.5 py-0.2 text-[10px] font-bold text-foreground tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </CollapsibleTrigger>
            </div>
          }
        />

        <PomodoroReportToolbar
          sessionType={sessionType}
          status={statusFilter}
          project={projectFilter}
          projects={projectOptions}
          activeFilterCount={activeFilterCount}
          onSessionTypeChange={(value) => {
            setSessionType(value);
            resetPages();
          }}
          onStatusChange={(value) => {
            setStatusFilter(value);
            resetPages();
          }}
          onProjectChange={(value) => {
            setProjectFilter(value);
            resetPages();
          }}
          onResetFilters={resetSessionFilters}
        />

        <div className="px-4 pb-5 sm:px-5">
          {query.validationError ? (
            <p
              id={`${id}-error`}
              role="alert"
              className="py-5 text-sm text-destructive-content"
            >
              {query.validationError}
            </p>
          ) : query.isError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center gap-2 py-5 text-sm text-destructive-content"
            >
              {copy.loadFailed}
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => void query.refetch()}
              >
                {copy.retry}
              </Button>
            </div>
          ) : query.isPending ? (
            <p
              role="status"
              className="flex items-center gap-2 py-10 text-sm text-muted-foreground"
            >
              <Spinner />
              {copy.loading}
            </p>
          ) : null}
          {ready && report && (
            <>
              <PomodoroReportSummary summary={report.summary} />
              <PomodoroReportChart days={report.daily} />
              <Tabs
                value={activeTab}
                onValueChange={(value) => {
                  if (value === tabs.history || value === tabs.daily)
                    setActiveTab(value);
                }}
                className="min-w-0 gap-4 border-t border-border pt-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <TabsList
                    aria-label={copy.detailTabs}
                    className="h-auto max-w-full flex-wrap justify-start gap-1 rounded-control bg-muted p-1"
                  >
                    <TabsTrigger
                      value={tabs.history}
                      className="h-8 gap-2 rounded-control px-3 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-2xs"
                    >
                      <History aria-hidden="true" className="size-3.5" />
                      {copy.sessionHistory}
                      <span className="rounded-full bg-info-soft px-1.5 py-0.2 text-[10px] font-bold text-info-content tabular-nums">
                        {sortedSessions.length}
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value={tabs.daily}
                      className="h-8 gap-2 rounded-control px-3 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-2xs"
                    >
                      <Table2 aria-hidden="true" className="size-3.5" />
                      {copy.dailyStats}
                    </TabsTrigger>
                  </TabsList>

                  {activeTab === tabs.history && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {copy.sessionCount(sortedSessions.length)}
                      </span>
                      <CustomSelect
                        ariaLabel="Sort session history"
                        value={sortOrder}
                        onChange={(value) =>
                          setSortOrder(
                            value === "longest" ? "longest" : "recent",
                          )
                        }
                        triggerClassName="h-8 rounded-control bg-card px-2.5 text-xs font-semibold"
                        options={[
                          { value: "recent", label: "Most recent first" },
                          { value: "longest", label: "Longest duration" },
                        ]}
                      />
                    </div>
                  )}
                </div>
                <TabsContent
                  value={tabs.history}
                  forceMount
                  className="min-w-0 data-[state=inactive]:hidden"
                >
                  <PomodoroSessionHistory
                    embedded
                    reportView
                    timeZone={dates.timeZone}
                    records={sortedSessions.slice(
                      sessionPagination.startIndex,
                      sessionPagination.endIndex,
                    )}
                    title={copy.sessionHistory}
                    totalCount={sortedSessions.length}
                    showDates
                    page={sessionPagination.currentPage}
                    totalPages={sessionPagination.totalPages}
                    onPageChange={setSessionPage}
                  />
                </TabsContent>
                <TabsContent
                  value={tabs.daily}
                  forceMount
                  className="min-w-0 data-[state=inactive]:hidden"
                >
                  <PomodoroDailyStats
                    days={visibleDays.slice(
                      dailyPagination.startIndex,
                      dailyPagination.endIndex,
                    )}
                    visibleDayCount={visibleDays.length}
                    totalDays={report.daily.length}
                    hideEmptyDays={hideEmptyDays}
                    onHideEmptyDaysChange={(hide) => {
                      setHideEmptyDays(hide);
                      setDailyPage(defaults.page);
                    }}
                    page={dailyPagination.currentPage}
                    totalPages={dailyPagination.totalPages}
                    onPageChange={setDailyPage}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </Collapsible>
    </section>
  );
}
