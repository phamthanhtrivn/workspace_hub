import { Bell, Plus, Trash2 } from "lucide-react";
import { Control, Controller, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { ReminderMethod } from "../../types/calendar.types";

const REMINDER_PRESETS = [
  { value: 1, label: "1 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 hour" },
  { value: 120, label: "2 hours" },
] as const;

export function ReminderEditor({
  control,
}: {
  control: Control<CalendarEventEditorValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "reminders",
  });

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
          <Bell className="h-3.5 w-3.5" />
          {copy.reminders}
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
          {copy.add}
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
                ariaLabel={copy.reminders}
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
                  ariaLabel={copy.reminders}
                  options={REMINDER_PRESETS.map((preset) => ({
                    value: String(preset.value),
                    label: preset.label,
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
            aria-label={copy.delete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
