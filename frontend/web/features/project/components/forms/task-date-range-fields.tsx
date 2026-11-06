"use client";
import { CustomDateField } from "@/components/ui/custom/custom-date-time-picker";
import { useId } from "react";
import { DATE_RANGE_MESSAGES, getDateRangeBounds, type DateRangeErrors } from "@/lib/date-range";


import { CalendarDays } from "lucide-react";
import { CustomCheckbox } from "@/components/ui/custom/custom-checkbox";

interface TaskDateRangeFieldsProps {
  allDay: boolean;
  onAllDayChange: (allDay: boolean) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  disabled?: boolean;
  today: string;
  errors: DateRangeErrors;
}

export function TaskDateRangeFields({
  allDay,
  onAllDayChange,
  startDate,
  onStartDateChange,
  dueDate,
  onDueDateChange,
  disabled = false,
  today,
  errors,
}: TaskDateRangeFieldsProps) {
  const id = useId();
  const bounds = getDateRangeBounds({ start: startDate, end: dueDate, today, dateOnly: allDay, mode: "create" });
  return (
    <section className="border-t border-border pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Schedule & Dates
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set target timelines for starting and completing this task.
          </p>
        </div>
        <CustomCheckbox
          checked={allDay}
          disabled={disabled}
          onCheckedChange={(checked) => onAllDayChange(Boolean(checked))}
          label="All Day Event"
          className="inline-flex cursor-pointer items-center gap-2 rounded-panel border border-border bg-background px-3 py-1.5"
          checkboxClassName="cursor-pointer data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          labelClassName="text-xs font-semibold text-muted-foreground"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CalendarDays
              className="h-3.5 w-3.5 text-muted-foreground"
              strokeWidth={2}
            />
            {allDay ? "Start Date" : "Start Date & Time"}
          </span>
          <CustomDateField
            dateOnly={allDay}
            value={startDate}
            min={bounds.startMin}
            max={bounds.startMax}
            invalid={Boolean(errors.start)}
            descriptionId={errors.start ? `${id}-start-error` : undefined}
            disabled={disabled}
            onChange={nextValue => onStartDateChange(nextValue)}
            className="h-11 w-full rounded-control border-input text-xs font-semibold text-foreground disabled:bg-background"
            ariaLabel="Task start date"
            allowClear
          />
          {errors.start && <p id={`${id}-start-error`} role="alert" className="mt-1.5 text-xs text-destructive-content">{errors.start}</p>}
        </label>
        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CalendarDays
              className="h-3.5 w-3.5 text-muted-foreground"
              strokeWidth={2}
            />
            {allDay ? "Due Date" : "Due Date & Time"}
          </span>
          <CustomDateField
            dateOnly={allDay}
            value={dueDate}
            min={bounds.endMin}
            disabled={disabled || !startDate}
            invalid={Boolean(errors.end)}
            descriptionId={errors.end || !startDate ? `${id}-end-description` : undefined}
            onChange={nextValue => onDueDateChange(nextValue)}
            className="h-11 w-full rounded-control border-input text-xs font-semibold text-foreground disabled:bg-background"
            ariaLabel="Task due date"
            allowClear
          />
          {(errors.end || !startDate) && <p id={`${id}-end-description`} role={errors.end ? "alert" : undefined}
            className="mt-1.5 text-xs text-muted-foreground">{errors.end || DATE_RANGE_MESSAGES.startRequired}</p>}
        </label>
      </div>
    </section>
  );
}
