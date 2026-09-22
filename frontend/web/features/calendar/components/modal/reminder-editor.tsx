import { Bell, Plus, Trash2 } from "lucide-react";
import { Control, Controller, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { ReminderMethod } from "../../types/calendar.types";

const REMINDER_PRESETS = [
  { value: 1, vi: "1 ph\u00FAt", en: "1 min" },
  { value: 5, vi: "5 ph\u00FAt", en: "5 min" },
  { value: 10, vi: "10 ph\u00FAt", en: "10 min" },
  { value: 15, vi: "15 ph\u00FAt", en: "15 min" },
  { value: 30, vi: "30 ph\u00FAt", en: "30 min" },
  { value: 60, vi: "1 gi\u1EDD", en: "1 hour" },
  { value: 120, vi: "2 gi\u1EDD", en: "2 hours" },
] as const;

export function ReminderEditor({
  control,
}: {
  control: Control<CalendarEventEditorValues>;
}) {
  const intl = useAppIntl();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "reminders",
  });

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
          <Bell className="h-3.5 w-3.5" />
          {intl.formatMessage({ id: "calendar.reminders" })}
        </span>
        <Button
          type="button"
          variant="ghost"
          disabled={fields.length >= 5}
          onClick={() =>
            append({ minutesBefore: 10, method: ReminderMethod.ALERT })
          }
          className="h-auto cursor-pointer gap-1 p-0 text-xs font-medium text-blue-600 hover:bg-transparent hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          {intl.formatMessage({ id: "app.add" })}
        </Button>
      </div>
      {fields.map((reminder, index) => (
        <div
          key={reminder.id}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2"
        >
          <Controller
            control={control}
            name={`reminders.${index}.method`}
            render={({ field }) => (
              <CustomSelect
                value={field.value}
                onChange={field.onChange}
                ariaLabel={intl.formatMessage({ id: "calendar.reminders" })}
                options={Object.values(ReminderMethod).map((method) => ({
                  value: method,
                  label: method,
                }))}
                triggerClassName="h-8 rounded-xl border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                contentClassName="rounded-lg border-slate-200"
              />
            )}
          />
          <div className="relative">
            <Controller
              control={control}
              name={`reminders.${index}.minutesBefore`}
              render={({ field }) => (
                <CustomSelect
                  value={String(field.value)}
                  onChange={(value) => field.onChange(Number(value))}
                  ariaLabel={intl.formatMessage({ id: "calendar.reminders" })}
                  options={REMINDER_PRESETS.map((preset) => ({
                    value: String(preset.value),
                    label: intl.locale.toLowerCase().startsWith("vi")
                      ? preset.vi
                      : preset.en,
                  }))}
                  triggerClassName="h-8 rounded-xl border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                  contentClassName="rounded-lg border-slate-200"
                />
              )}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
            aria-label={intl.formatMessage({ id: "app.delete" })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
