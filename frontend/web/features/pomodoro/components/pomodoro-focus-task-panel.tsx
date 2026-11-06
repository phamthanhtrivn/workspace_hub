"use client";

import { useId, useMemo, useState } from "react";
import { CalendarDays, FolderKanban, Plus, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";
import { useScheduleToday } from "@/hooks/use-schedule-today";
import { useAccountTimezone } from "@/features/user-setting/hooks/use-account-timezone";
import type { CalendarEvent } from "@/features/calendar/types/calendar.types";
import { POMODORO_TASK_COPY as copy, POMODORO_TASK_SETTINGS } from "../constants/pomodoro-task";
import type { FocusPickerDateRange, FocusPickerSource, FocusPickerTask } from "../types/focus-picker";
import { filterFocusPickerTasks } from "../utils/focus-picker-tasks";
import { sameFocusTask, toCalendarFocusTask, toProjectFocusTask } from "../utils/focus-task";
import { usePomodoroSessionActions } from "./pomodoro-session-provider";
import { PomodoroPanelHeader } from "./pomodoro-panel-header";
import { PomodoroFocusTaskRow } from "./pomodoro-focus-task-row";
import { PomodoroIncompleteTaskTray } from "./pomodoro-incomplete-task-tray";

interface FocusTaskPanelProps {
  source: FocusPickerSource;
  entries: FocusPickerTask[];
  loading: boolean;
  error: boolean;
  disabled: boolean;
  onRetry: () => void;
  onCreateTask?: () => void;
  onDeleteCalendarTask?: (event: CalendarEvent) => void;
}

export function PomodoroFocusTaskPanel({ source, entries, loading, error, disabled, onRetry, onCreateTask, onDeleteCalendarTask }: FocusTaskPanelProps) {
  const id = useId();
  const calendar = source === "calendar";
  const label = calendar ? "Calendar" : "Project";
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [range, setRange] = useState<FocusPickerDateRange>({ startDate: "", endDate: "" });
  const timeZone = useAccountTimezone();
  const { today, refreshToday } = useScheduleToday(timeZone);
  const projects = useMemo(() => [...new Map(entries.flatMap(entry => entry.source === "project" ? [[entry.project.id, entry.project] as const] : [])).values()]
    .sort((first, second) => first.name.localeCompare(second.name)), [entries]);
  const selectedProject = projects.some(project => project.id === projectId) ? projectId : "";
  const filtered = useMemo(() => filterFocusPickerTasks(entries, { search, projectId: selectedProject, range, today, timeZone }),
    [entries, search, selectedProject, range, today, timeZone]);
  const filterKey = JSON.stringify([search, selectedProject, range, today, timeZone]);
  const hasFilters = Boolean(search || selectedProject || range.startDate || range.endDate);
  const clearFilters = () => { setSearch(""); setProjectId(""); setRange({ startDate: "", endDate: "" }); };

  return <Card className="@container/task-panel flex h-full min-w-0 flex-col gap-0 overflow-hidden p-0" onFocusCapture={refreshToday} onPointerDownCapture={refreshToday}>
    <PomodoroPanelHeader title={label + " tasks"}
      icon={calendar ? CalendarDays : FolderKanban}
      action={onCreateTask && <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onCreateTask}><Plus aria-hidden="true" className="size-4" />Add task</Button>} />
    <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
      <div className="space-y-3">
        <label htmlFor={id + "-search"} className="block space-y-1.5 text-xs font-medium text-muted-foreground">
          <span>Task name</span>
          <span className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2" />
            <Input id={id + "-search"} type="search" className="h-10 pl-9" placeholder="Search task names..." value={search} onChange={event => setSearch(event.target.value)} />
          </span>
        </label>
        {!calendar && <div className="space-y-1.5">
          <label htmlFor={id + "-project"} className="text-xs font-medium text-muted-foreground">Project</label>
          <CustomSelect id={id + "-project"} ariaLabel="Filter Project tasks by project" triggerClassName="h-10" value={selectedProject} onChange={setProjectId}
            options={[{ value: "", label: "All projects" }, ...projects.map(project => ({ value: project.id, label: project.name }))]} />
        </div>}
        <div className="grid grid-cols-1 gap-3 @min-[340px]/task-panel:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={id + "-start"} className="text-xs font-medium text-muted-foreground">Start Date</label>
            <CustomDatePicker id={id + "-start"} ariaLabel={label + " task filter start date"} value={range.startDate}
              onChange={startDate => setRange(previous => ({ ...previous, startDate }))} max={range.endDate || undefined}
              triggerClassName="h-10" invalid={Boolean(filtered.errors.startDate)} descriptionId={id + "-date-help"} />
            {filtered.errors.startDate && <p role="alert" className="text-xs text-destructive-content">{filtered.errors.startDate}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor={id + "-end"} className="text-xs font-medium text-muted-foreground">End Date</label>
            <CustomDatePicker id={id + "-end"} ariaLabel={label + " task filter end date"} value={range.endDate}
              onChange={endDate => setRange(previous => ({ ...previous, endDate }))} min={range.startDate || undefined}
              triggerClassName="h-10" invalid={Boolean(filtered.errors.endDate)} descriptionId={id + "-date-help"} />
            {filtered.errors.endDate && <p role="alert" className="text-xs text-destructive-content">{filtered.errors.endDate}</p>}
          </div>
        </div>
        <div className="flex items-start justify-between gap-3">
          <p id={id + "-date-help"} className="text-xs leading-relaxed text-muted-foreground">{filtered.hasDateFilter ? copy.filteredDateOrder : copy.defaultDateOrder}</p>
          {hasFilters && <Button type="button" variant="link" size="sm" className="h-auto shrink-0 px-0 py-0 text-xs" onClick={clearFilters}>Clear filters</Button>}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <FocusTaskResults key={filterKey} label={label} filtered={filtered} loading={loading} error={error} onRetry={onRetry}
          disabled={disabled} onDeleteCalendarTask={onDeleteCalendarTask} />
      </div>
    </div>
  </Card>;
}

function FocusTaskResults({ label, filtered, loading, error, onRetry, disabled, onDeleteCalendarTask }: {
  label: string;
  filtered: ReturnType<typeof filterFocusPickerTasks>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  disabled: boolean;
  onDeleteCalendarTask?: (event: CalendarEvent) => void;
}) {
  const { activeTask, selectFocusTask, status, mode } = usePomodoroSessionActions();
  const [limit, setLimit] = useState<number>(POMODORO_TASK_SETTINGS.focusPageSize);
  const total = filtered.scheduled.length + filtered.missingDates.length;
  // Reserve space in the first page for both groups when both contain tasks.
  const missingSlots = Math.min(filtered.missingDates.length, Math.floor(limit / 2));
  const visibleScheduled = filtered.scheduled.slice(0, limit - missingSlots);
  const visibleMissing = filtered.missingDates.slice(0, Math.max(0, limit - visibleScheduled.length));
  const shown = visibleScheduled.length + visibleMissing.length;
  const row = (entry: FocusPickerTask) => {
    const target = entry.source === "calendar" ? toCalendarFocusTask(entry.event) : toProjectFocusTask(entry.task, entry.project);
    const current = sameFocusTask(activeTask, target);
    return <PomodoroFocusTaskRow key={entry.id} entry={entry} current={current} running={mode === "FOCUS" && status === "RUNNING"}
      paused={mode === "FOCUS" && status === "PAUSED"} disabled={disabled}
      onSelect={() => void selectFocusTask(current ? null : target)} onDelete={() => { if (entry.source === "calendar") onDeleteCalendarTask?.(entry.event); }} />;
  };
  return <>
    <div role="region" aria-label={label + " focus task list"} tabIndex={0} aria-busy={loading}
      className="h-[28rem] max-h-[60dvh] shrink-0 overflow-y-auto overscroll-contain rounded-control p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
      {loading && <LoadingState label={"Loading " + label + " tasks..."} className="py-6 text-xs text-muted-foreground" />}
      {error && <div role="alert" className="space-y-2 py-4 text-center text-xs text-destructive-content">
        <p>{"Unable to load " + label + " tasks. Try again to refresh the list."}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      </div>}
      {visibleScheduled.length > 0 && <ul aria-label={label + " scheduled tasks"} className="space-y-2">{visibleScheduled.map(row)}</ul>}

      {!loading && !error && filtered.scheduled.length === 0 && <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-muted-foreground">
        <SearchX aria-hidden="true" className="size-5" />
        <p>{total === 0 ? "No tasks found." : "No scheduled tasks."}</p>
      </div>}
    </div>
    <div className="mt-auto shrink-0 space-y-3 border-t border-border pt-3">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
      <p role="status" className="text-xs tabular-nums text-muted-foreground">Showing {shown} of {total} tasks</p>
      {shown < total && <Button type="button" variant="outline" size="sm" onClick={() => setLimit(previous => previous + POMODORO_TASK_SETTINGS.focusPageSize)}>{copy.loadMore}</Button>}
      </div>
      {filtered.missingDates.length > 0 && <PomodoroIncompleteTaskTray count={filtered.missingDates.length}>
        <ul aria-label="Project tasks missing dates" className="space-y-2">{visibleMissing.map(row)}</ul>
      </PomodoroIncompleteTaskTray>}
    </div>
  </>;
}
