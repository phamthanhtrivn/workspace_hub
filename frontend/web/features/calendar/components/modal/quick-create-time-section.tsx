"use client";

import { Clock3 } from "lucide-react";
import { ReactNode, useMemo } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CALENDAR_FORM_COPY as copy,
  CALENDAR_FORM_LOCALE,
} from "../../constants/calendar-form-copy";
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

export type QuickCreateKind = "event" | "task";

export function QuickRow({
  icon,
  children,
  className,
  contentClassName,
}: {
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3",
        className,
      )}
    >
      <span className="mt-1 grid h-9 w-9 place-items-center rounded-xl text-slate-500">
        {icon}
      </span>
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
    </div>
  );
}

export function QuickCreateTimeSection({
  form,
  kind,
  recurrencePreset,
  recurrenceOptions,
  onStartDateChange,
  onEndDateChange,
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
  onEndDateChange: (date: string) => void;
  onStartTimeChange: (time: string) => void;
  onEndDateTimeChange: (dateTime: string) => void;
  onAllDayChange: (checked: boolean) => void;
  onRecurrenceChange: (preset: CalendarRecurrencePreset) => void;
}) {
  const { control, setValue } = form;
  const startAt = useWatch({ control, name: "startAt" });
  const endAt = useWatch({ control, name: "endAt" });
  const allDay = useWatch({ control, name: "allDay" });
  const startTime = getTimeInputValue(startAt);
  const startTimeOptions = useMemo(
    () => createStartTimeOptions(CALENDAR_FORM_LOCALE, startTime),
    [startTime],
  );
  const endTimeOptions = useMemo(
    () => createEndTimeOptions(startAt, endAt, CALENDAR_FORM_LOCALE),
    [endAt, startAt],
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
      <div className="space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="min-w-0 rounded-2xl border border-slate-200/70 bg-slate-50/90 px-3 py-2 transition-colors hover:bg-slate-100/90">
            <span className="block text-xs font-medium text-slate-500">
              {copy.startDate}
            </span>
            <Input
              type="date"
              aria-label={copy.startDate}
              value={getDateInputValue(startAt)}
              onChange={(event) => onStartDateChange(event.target.value)}
              className="h-8 w-full min-w-0 cursor-pointer border-0 bg-transparent px-0 py-0 text-sm font-semibold text-slate-700 shadow-none outline-none focus-visible:ring-0"
            />
          </label>
          <label className="min-w-0 rounded-2xl border border-slate-200/70 bg-slate-50/90 px-3 py-2 transition-colors hover:bg-slate-100/90">
            <span className="block text-xs font-medium text-slate-500">
              {copy.endDate}
            </span>
            <Input
              type="date"
              aria-label={copy.endDate}
              value={getDateInputValue(endAt)}
              min={getDateInputValue(startAt)}
              onChange={(event) => onEndDateChange(event.target.value)}
              className="h-8 w-full min-w-0 cursor-pointer border-0 bg-transparent px-0 py-0 text-sm font-semibold text-slate-700 shadow-none outline-none focus-visible:ring-0"
            />
          </label>
        </div>

        {!allDay && (
          <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <CalendarSelect
              value={startTime}
              options={startTimeOptions}
              ariaLabel={copy.start}
              onChange={onStartTimeChange}
              triggerClassName="h-10 w-full justify-between rounded-xl border border-slate-200/70 bg-slate-100/80 px-3 text-slate-700 hover:bg-slate-200/70 data-[state=open]:bg-white"
              popupClassName="min-w-[11.75rem]"
            />
            <span className="hidden text-sm font-medium text-slate-400 sm:block">
              -
            </span>
            <CalendarSelect
              value={endAt}
              options={endTimeOptions}
              ariaLabel={copy.end}
              onChange={onEndDateTimeChange}
              triggerLabel={selectedEndTimeLabel}
              triggerClassName="h-10 w-full justify-between rounded-xl border border-slate-200/70 bg-slate-100/80 px-3 text-slate-700 hover:bg-slate-200/70 data-[state=open]:bg-white"
              popupClassName="min-w-[11.75rem]"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-xs font-medium text-slate-500">
          <label className="inline-flex cursor-pointer items-center gap-2">
            <Checkbox
              aria-label={copy.allDay}
              checked={allDay}
              onCheckedChange={(checked) => {
                setValue("allDay", checked, { shouldDirty: true });
                onAllDayChange(checked);
              }}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            {copy.allDay}
          </label>
          {kind === "event" && (
            <>
              <span className="text-slate-300">{"\u00B7"}</span>
              <span>
                {copy.timeZone}
              </span>
            </>
          )}
        </div>

        <CalendarSelect
          value={recurrencePreset}
          options={recurrenceOptions}
          ariaLabel={copy.recurrence}
          onChange={(value) =>
            onRecurrenceChange(value as CalendarRecurrencePreset)
          }
          alignItemWithTrigger={false}
          triggerClassName="h-10 w-full justify-between rounded-xl border border-slate-200/70 bg-slate-100/80 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-200/70 data-[state=open]:bg-white"
          popupClassName="min-w-[15.5rem]"
        />
      </div>
    </QuickRow>
  );
}
