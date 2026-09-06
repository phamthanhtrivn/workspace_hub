import React from "react";
import { CalendarDays } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";

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
  const intl = useAppIntl();

  return (
    <section className="border-t border-slate-100 pt-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[var(--color-primary-dark)]">
            {intl.formatMessage({ id: "project.schedule" })}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {intl.formatMessage({ id: "project.task.scheduleHint" })}
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          <input
            type="checkbox"
            checked={allDay}
            disabled={disabled}
            onChange={(event) => onAllDayChange(event.target.checked)}
            className="h-4 w-4 accent-[var(--color-secondary)] disabled:opacity-50"
          />
          {intl.formatMessage({ id: "project.task.allDay" })}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <CalendarDays
              className="h-3.5 w-3.5 text-slate-400"
              strokeWidth={2}
            />
            {intl.formatMessage({
              id: allDay ? "project.task.startDate" : "project.task.startAt",
            })}
          </span>
          <input
            type={allDay ? "date" : "datetime-local"}
            value={startDate}
            disabled={disabled}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10 disabled:bg-slate-50"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <CalendarDays
              className="h-3.5 w-3.5 text-slate-400"
              strokeWidth={2}
            />
            {intl.formatMessage({
              id: allDay ? "project.task.endDate" : "project.task.dueAt",
            })}
          </span>
          <input
            type={allDay ? "date" : "datetime-local"}
            value={dueDate}
            disabled={disabled}
            onChange={(event) => onDueDateChange(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-[var(--color-secondary)]/10 disabled:bg-slate-50"
          />
        </label>
      </div>
    </section>
  );
}
