"use client";

import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";
import { DATE_RANGE_MESSAGES, getDateRangeBounds } from "@/lib/date-range";
import { POMODORO_REPORT_COPY as copy } from "../constants/pomodoro-report";
import type { PomodoroReportRange, PomodoroReportRangeErrors } from "../utils/pomodoro-report";

const CONTROL_CLASS = "h-10 w-full min-w-0 rounded-control border-input bg-background px-3 text-sm font-normal shadow-none";

export function PomodoroReportDateFilters({ id, range, today, errors, onRangeChange }: {
  id: string;
  range: PomodoroReportRange;
  today: string;
  errors: PomodoroReportRangeErrors;
  onRangeChange: (range: PomodoroReportRange) => void;
}) {
  const bounds = getDateRangeBounds({ start: errors.startDate ? "" : range.startDate, end: errors.endDate ? "" : range.endDate, mode: "edit", dateOnly: true });
  const startMax = bounds.startMax && bounds.startMax < today ? bounds.startMax : today;
  const endDisabled = !range.startDate || Boolean(errors.startDate);
  const descriptionId = (field: keyof PomodoroReportRange) => errors[field] ? `${id}-${field}-error` : `${id}-hint`;
  return <div className="grid min-w-0 grid-cols-1 gap-4 @min-[480px]/pomodoro:grid-cols-2">
    <div className="min-w-0 space-y-2">
      <label htmlFor={`${id}-start`} className="block text-xs font-medium text-muted-foreground">{copy.fromDate}</label>
      <CustomDatePicker id={`${id}-start`} value={range.startDate} ariaLabel={copy.fromDate}
        onChange={startDate => onRangeChange({ ...range, startDate })} allowClear
        max={startMax} invalid={Boolean(errors.startDate)} descriptionId={descriptionId("startDate")} triggerClassName={CONTROL_CLASS} />
      {errors.startDate && <p id={`${id}-startDate-error`} role="alert" className="text-xs text-destructive-content">{errors.startDate}</p>}
    </div>
    <div className="min-w-0 space-y-2">
      <label htmlFor={`${id}-end`} className="block text-xs font-medium text-muted-foreground">{copy.toDate}</label>
      <CustomDatePicker id={`${id}-end`} value={range.endDate} ariaLabel={copy.toDate}
        onChange={endDate => onRangeChange({ ...range, endDate })} allowClear
        min={bounds.endMin} max={today} disabled={endDisabled}
        invalid={Boolean(errors.endDate)} descriptionId={endDisabled && !errors.endDate ? `${id}-end-hint` : descriptionId("endDate")} triggerClassName={CONTROL_CLASS} />
      {errors.endDate ? <p id={`${id}-endDate-error`} role="alert" className="text-xs text-destructive-content">{errors.endDate}</p>
        : endDisabled && <p id={`${id}-end-hint`} className="text-xs text-muted-foreground">{DATE_RANGE_MESSAGES.startRequired}</p>}
    </div>
  </div>;
}
