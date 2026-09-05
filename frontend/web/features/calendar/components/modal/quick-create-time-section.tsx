"use client";

import { Clock3 } from "lucide-react";
import { ReactNode, useMemo } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
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

export type QuickCreateKind = "event" | "task" | "appointment";

export function QuickRow({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
      <span className="mt-2 grid h-8 w-8 place-items-center text-slate-600">
        {icon}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function QuickCreateTimeSection({
  form,
  kind,
  recurrencePreset,
  recurrenceOptions,
  onStartDateChange,
  onStartTimeChange,
  onEndDateTimeChange,
  onAllDayChange,
  onRecurrenceChange,
}: {
  form: UseFormReturn<CalendarEventEditorValues>;
  kind: QuickCreateKind;
  recurrencePreset: CalendarRecurrencePreset;
  recurrenceOptions: Array<{ value: string; label: string }>;
  onStartDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateTimeChange: (dateTime: string) => void;
  onAllDayChange: (checked: boolean) => void;
  onRecurrenceChange: (preset: CalendarRecurrencePreset) => void;
}) {
  const intl = useAppIntl();
  const { control, register } = form;
  const startAt = useWatch({ control, name: "startAt" });
  const endAt = useWatch({ control, name: "endAt" });
  const allDay = useWatch({ control, name: "allDay" });
  const allDayRegistration = register("allDay");
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
    <QuickRow icon={<Clock3 className="h-5 w-5" />}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-1 py-1.5 hover:bg-slate-200/50">
        <input
          type="date"
          aria-label={intl.formatMessage({ id: "calendar.start" })}
          value={getDateInputValue(startAt)}
          onChange={(event) => onStartDateChange(event.target.value)}
          className="h-8 cursor-pointer border-0 bg-transparent text-sm font-medium text-slate-700 outline-none"
        />
        {!allDay && (
          <>
            <CalendarSelect
              value={startTime}
              options={startTimeOptions}
              ariaLabel={intl.formatMessage({ id: "calendar.start" })}
              onChange={onStartTimeChange}
              triggerClassName="h-8 min-w-[6.6rem] bg-slate-200/80 px-2.5"
              popupClassName="min-w-[11.75rem]"
            />
            {kind !== "appointment" && (
              <>
                <span className="text-sm text-slate-500">-</span>
                <CalendarSelect
                  value={endAt}
                  options={endTimeOptions}
                  ariaLabel={intl.formatMessage({ id: "calendar.end" })}
                  onChange={onEndDateTimeChange}
                  triggerLabel={selectedEndTimeLabel}
                  triggerClassName="h-8 min-w-[6.6rem] bg-slate-200/80 px-2.5"
                  popupClassName="min-w-[11.75rem]"
                />
              </>
            )}
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-xs text-slate-500">
        <label className="inline-flex cursor-pointer items-center gap-1.5">
          <input
            {...allDayRegistration}
            type="checkbox"
            aria-label={intl.formatMessage({ id: "calendar.allDay" })}
            checked={allDay}
            onChange={(event) => {
              void allDayRegistration.onChange(event);
              onAllDayChange(event.target.checked);
            }}
            className="h-3.5 w-3.5 rounded border-slate-300"
          />
          {intl.formatMessage({ id: "calendar.allDay" })}
        </label>
        {kind === "event" && (
          <>
            <span>·</span>
            <span>{intl.formatMessage({ id: "calendar.quick.timeZone" })}</span>
          </>
        )}
      </div>
      {kind !== "appointment" && (
        <div className="mt-1 px-1">
          <CalendarSelect
            value={recurrencePreset}
            options={recurrenceOptions}
            ariaLabel={intl.formatMessage({ id: "calendar.recurrence" })}
            onChange={(value) =>
              onRecurrenceChange(value as CalendarRecurrencePreset)
            }
            alignItemWithTrigger={false}
            triggerClassName="h-9 min-w-[10.5rem] justify-between bg-slate-200/80 px-3 text-slate-600"
            popupClassName="min-w-[15.5rem]"
          />
        </div>
      )}
    </QuickRow>
  );
}
