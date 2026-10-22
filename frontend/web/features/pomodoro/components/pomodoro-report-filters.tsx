"use client";

import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { POMODORO_REPORT_COPY as copy, POMODORO_REPORT_SOURCES } from "../constants/pomodoro-report";
import { cn } from "@/lib/utils";
import type { PomodoroReportFilters as ReportFilters, PomodoroReportRange, PomodoroReportRangeErrors, reportFilterOptions } from "../utils/pomodoro-report";

const CONTROL_CLASS = "h-10 w-full min-w-0 rounded-control border-input bg-background px-3 text-sm font-normal shadow-none";

export function PomodoroReportDateFilters({ id, range, today, errors, onRangeChange }: {
  id: string;
  range: PomodoroReportRange;
  today: string;
  errors: PomodoroReportRangeErrors;
  onRangeChange: (range: PomodoroReportRange) => void;
}) {
  const descriptionId = (field: keyof PomodoroReportRange) => errors[field] ? `${id}-${field}-error` : `${id}-hint`;
  return <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 @min-[480px]/pomodoro:grid-cols-2">
    <div className="min-w-0 space-y-2">
      <label htmlFor={`${id}-start`} className="block text-xs font-medium text-muted-foreground">{copy.fromDate}</label>
      <CustomDatePicker id={`${id}-start`} value={range.startDate} ariaLabel={copy.fromDate}
        onChange={startDate => onRangeChange({ ...range, startDate })} allowClear
        max={today} invalid={Boolean(errors.startDate)} descriptionId={descriptionId("startDate")} triggerClassName={CONTROL_CLASS} />
      {errors.startDate && <p id={`${id}-startDate-error`} className="text-xs text-destructive-content">{errors.startDate}</p>}
    </div>
    <div className="min-w-0 space-y-2">
      <label htmlFor={`${id}-end`} className="block text-xs font-medium text-muted-foreground">{copy.toDate}</label>
      <CustomDatePicker id={`${id}-end`} value={range.endDate} ariaLabel={copy.toDate}
        onChange={endDate => onRangeChange({ ...range, endDate })} allowClear
        min={!errors.startDate ? range.startDate : undefined} max={today}
        invalid={Boolean(errors.endDate)} descriptionId={descriptionId("endDate")} triggerClassName={CONTROL_CLASS} />
      {errors.endDate && <p id={`${id}-endDate-error`} className="text-xs text-destructive-content">{errors.endDate}</p>}
    </div>
  </div>;
}

export function PomodoroReportSessionFilters({ id, filters, options, disabled, onFiltersChange }: {
  id: string;
  filters: ReportFilters;
  options: ReturnType<typeof reportFilterOptions>;
  disabled: boolean;
  onFiltersChange: (filters: ReportFilters) => void;
}) {
  return <fieldset className="mt-5 min-w-0 border-t border-border pt-4">
    <legend className="float-left mb-1 w-full text-sm font-semibold text-foreground">{copy.sessionFilters}</legend>
    <p className="clear-both text-xs leading-relaxed text-muted-foreground">{copy.sessionFiltersHint}</p>
    <div className={cn("mt-3 grid min-w-0 grid-cols-1 gap-5 @min-[480px]/pomodoro:grid-cols-2",
      filters.source === "project" && "@min-[800px]/pomodoro:grid-cols-3")}>
    <div className="min-w-0 space-y-2">
      <label htmlFor={`${id}-source`} className="block text-xs font-medium text-muted-foreground">{copy.source}</label>
      <CustomSelect id={`${id}-source`} value={filters.source} disabled={disabled} ariaLabel={copy.source} descriptionId={`${id}-source-hint`}
        options={POMODORO_REPORT_SOURCES.map(source => ({ ...source }))} triggerClassName={CONTROL_CLASS}
        onChange={value => {
          const source = POMODORO_REPORT_SOURCES.find(option => option.value === value);
          if (source) onFiltersChange({ source: source.value, project: "", task: "" });
        }} />
      <p id={`${id}-source-hint`} className="text-xs leading-relaxed text-muted-foreground">{filters.source === "personal" ? copy.personalSourceHint : copy.sourceHint}</p>
    </div>
    {filters.source === "project" && <div className="min-w-0 space-y-2">
      <label htmlFor={`${id}-project`} className="block text-xs font-medium text-muted-foreground">{copy.project}</label>
      <CustomSelect id={`${id}-project`} value={filters.project} disabled={disabled} ariaLabel={copy.project} descriptionId={`${id}-project-hint`}
        options={[{ value: "", label: copy.allProjects }, ...options.projects.map(([value, label]) => ({ value, label }))]}
        triggerClassName={CONTROL_CLASS} onChange={project => onFiltersChange({ ...filters, project, task: "" })} />
      <p id={`${id}-project-hint`} className="text-xs leading-relaxed text-muted-foreground">{copy.projectHint}</p>
    </div>}
    <div className="min-w-0 space-y-2">
      <label htmlFor={`${id}-task`} className="block text-xs font-medium text-muted-foreground">{copy.task}</label>
      <CustomSelect id={`${id}-task`} value={filters.task} disabled={disabled} ariaLabel={copy.task} descriptionId={`${id}-task-hint`}
        options={[{ value: "", label: copy.allTasks }, ...options.tasks.map(([value, label]) => ({ value, label }))]}
        triggerClassName={CONTROL_CLASS} onChange={task => onFiltersChange({ ...filters, task })} />
      <p id={`${id}-task-hint`} className="text-xs leading-relaxed text-muted-foreground">{filters.project ? copy.projectTaskHint : copy.taskHint}</p>
    </div>
    </div>
  </fieldset>;
}
