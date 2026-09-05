import { Bell, Plus, Trash2 } from "lucide-react";
import { Control, UseFormRegister, useFieldArray } from "react-hook-form";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { CALENDAR_REMINDER_OPTIONS } from "../../types/calendar.constants";
import { ReminderMethod } from "../../types/calendar.types";

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
            aria-label={intl.formatMessage({ id: "calendar.reminders" })}
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
              aria-label={intl.formatMessage({ id: "calendar.reminders" })}
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
