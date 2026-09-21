"use client";

import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

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
    <section className="border-t border-slate-100 pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Schedule & Dates
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Set target timelines for starting and completing this task.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 border border-slate-200/60">
          <Checkbox
            checked={allDay}
            disabled={disabled}
            onCheckedChange={(checked) => onAllDayChange(Boolean(checked))}
            className="cursor-pointer data-[state=checked]:bg-[#0052CC] data-[state=checked]:border-[#0052CC]"
          />
          All Day Event
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <CalendarDays
              className="h-3.5 w-3.5 text-slate-400"
              strokeWidth={2}
            />
            {allDay ? "Start Date" : "Start Date & Time"}
          </span>
          <Input
            type={allDay ? "date" : "datetime-local"}
            value={startDate}
            disabled={disabled}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="h-11 w-full rounded-xl border-slate-200 text-xs font-semibold text-slate-700 disabled:bg-slate-50"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <CalendarDays
              className="h-3.5 w-3.5 text-slate-400"
              strokeWidth={2}
            />
            {allDay ? "Due Date" : "Due Date & Time"}
          </span>
          <Input
            type={allDay ? "date" : "datetime-local"}
            value={dueDate}
            disabled={disabled}
            onChange={(event) => onDueDateChange(event.target.value)}
            className="h-11 w-full rounded-xl border-slate-200 text-xs font-semibold text-slate-700 disabled:bg-slate-50"
          />
        </label>
      </div>
    </section>
  );
}
