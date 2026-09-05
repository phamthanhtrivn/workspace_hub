import { useMemo } from "react";
import {
  UseFormRegister,
  UseFormRegisterReturn,
} from "react-hook-form";
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
      <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label={intl.formatMessage({ id: "calendar.start" })}
            value={getDateInputValue(startAt)}
            onChange={(event) => onStartDateChange(event.target.value)}
            className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />
          {!allDay && (
            <CalendarSelect
              value={startTime}
              options={startTimeOptions}
              ariaLabel={intl.formatMessage({ id: "calendar.start" })}
              onChange={onStartTimeChange}
              triggerClassName="h-10 min-w-[6.6rem] border border-slate-200 bg-white px-3"
              popupClassName="min-w-[11.75rem]"
            />
          )}
          <span className="px-1 text-sm font-black text-slate-400">
            {intl.formatMessage({ id: "calendar.to" })}
          </span>
          {!allDay && (
            <CalendarSelect
              value={endAt}
              options={endTimeOptions}
              ariaLabel={intl.formatMessage({ id: "calendar.end" })}
              onChange={onEndDateTimeChange}
              triggerLabel={selectedEndTimeLabel}
              triggerClassName="h-10 min-w-[6.6rem] border border-slate-200 bg-white px-3"
              popupClassName="min-w-[11.75rem]"
            />
          )}
          <input
            type="date"
            aria-label={intl.formatMessage({ id: "calendar.end" })}
            value={getDateInputValue(endAt)}
            onChange={(event) => onEndDateChange(event.target.value)}
            className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
            <input
              {...allDayRegistration}
              type="checkbox"
              checked={allDay}
              onChange={(event) => {
                void allDayRegistration.onChange(event);
                onAllDayChange(event.target.checked);
              }}
              className="h-4 w-4 cursor-pointer rounded border-slate-300"
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
            triggerClassName="h-10 min-w-[10.5rem] border border-slate-200 bg-white px-3"
            popupClassName="min-w-[15.5rem]"
          />
        </div>
      </div>

      {showRecurrenceScope && (
        <label className="block space-y-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
          <span className="text-xs font-black uppercase text-blue-700">
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
