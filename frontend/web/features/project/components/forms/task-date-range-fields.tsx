"use client";

import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomCheckbox } from "@/components/ui/custom/custom-checkbox";

interface TaskDateRangeFieldsProps {
  allDay: boolean;
  onAllDayChange: (allDay: boolean) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  dueDate: string;
  onDueDateChange: (date: string) => void;
  disabled?: boolean;
}

export function TaskDateRangeFields({
  allDay,
  onAllDayChange,
  startDate,
  onStartDateChange,
  dueDate,
  onDueDateChange,
  disabled = false,
}: TaskDateRangeFieldsProps) {
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
          <Input
            type={allDay ? "date" : "datetime-local"}
            value={startDate}
            disabled={disabled}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="h-11 w-full rounded-control border-input text-xs font-semibold text-foreground disabled:bg-background"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <CalendarDays
              className="h-3.5 w-3.5 text-muted-foreground"
              strokeWidth={2}
            />
            {allDay ? "Due Date" : "Due Date & Time"}
          </span>
          <Input
            type={allDay ? "date" : "datetime-local"}
            value={dueDate}
            disabled={disabled}
            onChange={(event) => onDueDateChange(event.target.value)}
            className="h-11 w-full rounded-control border-input text-xs font-semibold text-foreground disabled:bg-background"
          />
        </label>
      </div>
    </section>
  );
}
