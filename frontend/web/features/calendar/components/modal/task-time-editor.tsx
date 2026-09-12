"use client";

import { Clock3 } from "lucide-react";
import { useMemo } from "react";
import { UseFormRegisterReturn } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  getDateInputValue,
  getTimeInputValue,
} from "../../utils/calendar-date.utils";
import { CalendarRecurrencePreset } from "../../utils/calendar-recurrence.utils";
import { createStartTimeOptions } from "../../utils/calendar-time-options";
import { CalendarSelect } from "./calendar-select";

interface TaskTimeEditorProps {
  startAt: string;
  allDay: boolean;
  allDayRegistration: UseFormRegisterReturn<"allDay">;
  recurrencePreset: CalendarRecurrencePreset;
  recurrenceOptions: Array<{ value: string; label: string }>;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onAllDayChange: (checked: boolean) => void;
  onRecurrenceChange: (preset: CalendarRecurrencePreset) => void;
}

export function TaskTimeEditor({
  startAt,
  allDay,
  allDayRegistration,
  recurrencePreset,
  recurrenceOptions,
  onDateChange,
  onTimeChange,
  onAllDayChange,
  onRecurrenceChange,
}: TaskTimeEditorProps) {
  const intl = useAppIntl();
  const startTime = getTimeInputValue(startAt);
  const timeOptions = useMemo(
    () => createStartTimeOptions(intl.locale, startTime),
    [intl.locale, startTime],
  );

  return (
    <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <Clock3 className="h-4 w-4 text-slate-400" />
          <span>{intl.formatMessage({ id: "calendar.quick.deadline" })}:</span>
        </div>
        <input
          type="date"
          aria-label={intl.formatMessage({ id: "calendar.quick.deadline" })}
          value={getDateInputValue(startAt)}
          onChange={(event) => onDateChange(event.target.value)}
          className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {!allDay && (
          <CalendarSelect
            value={startTime}
            options={timeOptions}
            ariaLabel={intl.formatMessage({ id: "calendar.time" })}
            onChange={onTimeChange}
            triggerClassName="h-9 min-w-[6.2rem] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold"
            popupClassName="min-w-[11.75rem]"
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
          <input
            {...allDayRegistration}
            type="checkbox"
            checked={allDay}
            onChange={(event) => {
              void allDayRegistration.onChange(event);
              onAllDayChange(event.target.checked);
            }}
            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          {intl.formatMessage({ id: "calendar.allDay" })}
        </label>
        <CalendarSelect
          value={recurrencePreset}
          options={recurrenceOptions}
          ariaLabel={intl.formatMessage({ id: "calendar.recurrence" })}
          onChange={(value) =>
            onRecurrenceChange(value as CalendarRecurrencePreset)
          }
          alignItemWithTrigger={false}
          triggerClassName="h-9 min-w-[10rem] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
          popupClassName="min-w-[15.5rem]"
        />
      </div>
    </div>
  );
}
