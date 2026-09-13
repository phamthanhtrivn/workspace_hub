import { useMemo } from "react";
import { UseFormRegister, UseFormRegisterReturn } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { RecurrenceScope } from "../../types/calendar.types";
import {
  getDateInputValue,
  getTimeInputValue,
} from "../../utils/calendar-date.utils";
import { CalendarRecurrencePreset } from "../../utils/calendar-recurrence.utils";
import {
  createEndTimeOptions,
  createStartTimeOptions,
} from "../../utils/calendar-time-options";
import { CalendarSelect } from "./calendar-select";

interface EventTimeEditorProps {
  startAt: string;
  endAt: string;
  allDay: boolean;
  allDayRegistration: UseFormRegisterReturn<"allDay">;
  recurrencePreset: CalendarRecurrencePreset;
  recurrenceOptions: Array<{ value: string; label: string }>;
  showRecurrenceScope: boolean;
  register: UseFormRegister<CalendarEventEditorValues>;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateChange: (date: string) => void;
  onEndDateTimeChange: (dateTime: string) => void;
  onAllDayChange: (checked: boolean) => void;
  onRecurrenceChange: (preset: CalendarRecurrencePreset) => void;
}

export function EventTimeEditor({
  startAt,
  endAt,
  allDay,
  allDayRegistration,
  recurrencePreset,
  recurrenceOptions,
  showRecurrenceScope,
  register,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndDateTimeChange,
  onAllDayChange,
  onRecurrenceChange,
}: EventTimeEditorProps) {
  const intl = useAppIntl();
  const startTime = getTimeInputValue(startAt);
  const startTimeOptions = useMemo(
    () => createStartTimeOptions(intl.locale, startTime),
    [intl.locale, startTime],
  );
  const endTimeOptions = useMemo(
    () => createEndTimeOptions(startAt, endAt, intl.locale),
    [endAt, intl.locale, startAt],
  );
  const selectedEndTimeLabel = useMemo(
    () =>
      endTimeOptions
        .find((option) => option.value === endAt)
        ?.label.replace(/\s+\(.+\)$/, ""),
    [endAt, endTimeOptions],
  );

  return (
    <>
      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label={intl.formatMessage({ id: "calendar.start" })}
            value={getDateInputValue(startAt)}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {!allDay && (
            <CalendarSelect
              value={startTime}
              options={startTimeOptions}
              ariaLabel={intl.formatMessage({ id: "calendar.start" })}
              onChange={onStartTimeChange}
              triggerClassName="h-9 min-w-[6.2rem] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold"
              popupClassName="min-w-[11.75rem]"
            />
          )}
          <span className="px-0.5 text-xs font-medium text-slate-400">
            {intl.formatMessage({ id: "calendar.to" })}
          </span>
          {!allDay && (
            <CalendarSelect
              value={endAt}
              options={endTimeOptions}
              ariaLabel={intl.formatMessage({ id: "calendar.end" })}
              onChange={onEndDateTimeChange}
              triggerLabel={selectedEndTimeLabel}
              triggerClassName="h-9 min-w-[6.2rem] rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold"
              popupClassName="min-w-[11.75rem]"
            />
          )}
          <input
            type="date"
            aria-label={intl.formatMessage({ id: "calendar.end" })}
            value={getDateInputValue(endAt)}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="h-9 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
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

      {showRecurrenceScope && (
        <label className="block space-y-1.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
          <span className="text-xs font-medium uppercase tracking-wider text-blue-700">
            {intl.formatMessage({ id: "calendar.recurrenceScope" })}
          </span>
          <select
            {...register("recurrenceScope")}
            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {Object.values(RecurrenceScope).map((value) => (
              <option key={value} value={value}>
                {intl.formatMessage({ id: `calendar.scope.${value}` })}
              </option>
            ))}
          </select>
        </label>
      )}
    </>
  );
}
