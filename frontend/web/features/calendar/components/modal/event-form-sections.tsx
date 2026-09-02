"use client";

import { Bell, FileText, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Control,
  UseFormRegister,
  UseFormRegisterReturn,
  useFieldArray,
} from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import {
  CALENDAR_REMINDER_OPTIONS,
} from "../../types/calendar.constants";
import { RecurrenceScope, ReminderMethod } from "../../types/calendar.types";
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
}: {
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
}) {
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

export function ReminderEditor({
  control,
  register,
}: {
  control: Control<CalendarEventEditorValues>;
  register: UseFormRegister<CalendarEventEditorValues>;
}) {
  const intl = useAppIntl();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "reminders",
  });

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400">
          <Bell className="h-4 w-4" />
          {intl.formatMessage({ id: "calendar.reminders" })}
        </span>
        <button
          type="button"
          disabled={fields.length >= 5}
          onClick={() =>
            append({ minutesBefore: 10, method: ReminderMethod.ALERT })
          }
          className="inline-flex cursor-pointer items-center gap-1 text-xs font-black text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {intl.formatMessage({ id: "app.add" })}
        </button>
      </div>
      {fields.map((reminder, index) => (
        <div
          key={reminder.id}
          className="grid grid-cols-[1fr_1fr_auto] gap-2"
        >
          <select
            {...register(`reminders.${index}.method`)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            {Object.values(ReminderMethod).map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={43_200}
              list="calendar-reminder-minutes"
              {...register(`reminders.${index}.minutesBefore`, {
                valueAsNumber: true,
              })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm font-semibold text-slate-700"
            />
            <span className="pointer-events-none absolute right-2 top-2.5 text-[10px] font-bold text-slate-400">
              min
            </span>
          </div>
          <button
            type="button"
            onClick={() => remove(index)}
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
            aria-label={intl.formatMessage({ id: "app.delete" })}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <datalist id="calendar-reminder-minutes">
        {CALENDAR_REMINDER_OPTIONS.filter(
          (option) => option.value !== "custom",
        ).map((option) => (
          <option key={option.value} value={option.value} />
        ))}
      </datalist>
    </div>
  );
}

export function AttachmentEditor({ documentCount }: { documentCount: number }) {
  const intl = useAppIntl();
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 p-3">
      <label className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400">
        <FileText className="h-4 w-4" />
        {intl.formatMessage({ id: "calendar.quick.addFile" })}
      </label>
      <label className="block cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:bg-blue-50/50">
        <input
          type="file"
          multiple
          className="sr-only"
          aria-label={intl.formatMessage({ id: "calendar.quick.addFile" })}
          onChange={(event) =>
            setAttachmentNames(
              Array.from(event.target.files || []).map((file) => file.name),
            )
          }
        />
        {intl.formatMessage({ id: "calendar.quick.addFile" })}
        {attachmentNames.length > 0 && (
          <span className="mt-1 block truncate text-xs font-medium text-slate-500">
            {attachmentNames.join(", ")}
          </span>
        )}
        {documentCount > 0 && attachmentNames.length === 0 && (
          <span className="mt-1 block text-xs font-medium text-slate-500">
            {intl.formatMessage(
              { id: "calendar.attachedDocuments" },
              { count: documentCount },
            )}
          </span>
        )}
      </label>
    </div>
  );
}
