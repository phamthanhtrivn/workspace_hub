"use client";

import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleContent } from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import type { usePomodoroReportRange } from "../hooks/use-pomodoro-report-range";
import { formatReportRange } from "../utils/pomodoro-report";
import { PomodoroReportDateFilters } from "./pomodoro-report-filters";

interface PomodoroReportToolbarProps {
  id: string;
  dates: ReturnType<typeof usePomodoroReportRange>;
  updating: boolean;
  onApplyDates: () => void;
}

export function PomodoroReportToolbar({ id, dates, updating, onApplyDates }: PomodoroReportToolbarProps) {
  return <div className="space-y-4 border-b border-border bg-muted/20 px-4 py-4 sm:px-5">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-xs">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
        <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
        <span>{copy.appliedRange}:</span><span className="font-medium text-foreground">{formatReportRange(dates.applied)}</span>
        {dates.preset === "custom" && <span className="rounded-control bg-muted px-2 py-1 font-medium">{copy.customRange}</span>}
      </p>
      {updating && <span role="status" className="flex items-center gap-1.5 text-muted-foreground"><Spinner size={14} />{copy.updating}</span>}
    </div>
    {dates.dirty && <p role="status" className="text-xs text-warning-content">{copy.unapplied}</p>}
    <CollapsibleContent keepMounted>
    <fieldset className="min-w-0">
      <legend className="sr-only">{copy.dateRange}</legend>
      <div className="grid min-w-0 gap-3 @min-[640px]/pomodoro:grid-cols-[minmax(0,1fr)_auto] @min-[640px]/pomodoro:gap-4">
        <PomodoroReportDateFilters id={id} range={dates.draft} today={dates.today} errors={dates.errors} onRangeChange={dates.setDraft} />
        <div className="flex items-center gap-2 self-end">
          <Button type="button" size="sm" className="h-10" disabled={!dates.dirty || Object.keys(dates.errors).length > 0} onClick={onApplyDates}>{copy.apply}</Button>
          <Button type="button" variant="ghost" size="sm" className="h-10" disabled={!dates.dirty} onClick={dates.cancel}>{copy.cancel}</Button>
        </div>
      </div>
      <p id={`${id}-hint`} className="mt-3 text-xs leading-relaxed text-muted-foreground">{copy.rangeHint}</p>
    </fieldset>
    </CollapsibleContent>
  </div>;
}
