import { Bell, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Control, Controller, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { Input } from "@/components/ui/input";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import {
  CALENDAR_MAX_REMINDERS,
  CALENDAR_MAX_REMINDER_MINUTES_BEFORE,
} from "../../types/calendar.constants";
import { ReminderMethod } from "../../types/calendar.types";
import {
  getCustomReminderParts,
  isReminderPreset,
  REMINDER_PRESETS,
  REMINDER_UNIT_MINUTES,
  ReminderUnit,
  toReminderMinutes,
} from "../../utils/calendar-reminder.utils";

const CUSTOM_VALUE = "custom";

const REMINDER_UNIT_OPTIONS: Array<{ value: ReminderUnit; label: string }> = [
  { value: "minutes", label: copy.reminderMinutes },
  { value: "hours", label: copy.reminderHours },
  { value: "days", label: copy.reminderDays },
  { value: "weeks", label: copy.reminderWeeks },
];

function ReminderRow({
  control,
  index,
  initialMinutesBefore,
  onRemove,
}: {
  control: Control<CalendarEventEditorValues>;
  index: number;
  initialMinutesBefore: number;
  onRemove: () => void;
}) {
  const initialParts = getCustomReminderParts(initialMinutesBefore);
  const [custom, setCustom] = useState(() => !isReminderPreset(initialMinutesBefore));
  const [amount, setAmount] = useState(String(initialParts.amount));
  const [unit, setUnit] = useState<ReminderUnit>(initialParts.unit);

  return (
    <Controller
      control={control}
      name={`reminders.${index}.minutesBefore`}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
            <Controller
              control={control}
              name={`reminders.${index}.method`}
              render={({ field: methodField }) => (
                <CustomSelect
                  value={methodField.value}
                  onChange={methodField.onChange}
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
            <CustomSelect
              value={custom ? CUSTOM_VALUE : String(field.value)}
              onChange={(value) => {
                if (value === CUSTOM_VALUE) {
                  const parts = getCustomReminderParts(field.value);
                  setAmount(String(parts.amount));
                  setUnit(parts.unit);
                  setCustom(true);
                  return;
                }
                setCustom(false);
                field.onChange(Number(value));
              }}
              ariaLabel={copy.reminders}
              invalid={Boolean(fieldState.error)}
              options={[
                ...REMINDER_PRESETS.map((preset) => ({
                  value: String(preset.value),
                  label: preset.label,
                })),
                { value: CUSTOM_VALUE, label: copy.reminderCustom },
              ]}
              triggerClassName="h-8 rounded-xl border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-700 shadow-none hover:bg-slate-50"
              contentClassName="rounded-lg border-slate-200"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
              aria-label={copy.delete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {custom && (
            <div className="grid grid-cols-2 gap-2 pr-10">
              <Input
                type="number"
                min={0}
                max={Math.floor(
                  CALENDAR_MAX_REMINDER_MINUTES_BEFORE /
                    REMINDER_UNIT_MINUTES[unit],
                )}
                step={1}
                value={amount}
                onChange={(event) => {
                  const nextAmount = event.target.value;
                  setAmount(nextAmount);
                  field.onChange(toReminderMinutes(nextAmount, unit));
                }}
                onBlur={field.onBlur}
                aria-label={copy.reminderAmount}
                aria-invalid={Boolean(fieldState.error)}
                className="h-8 rounded-xl border-slate-200/80 bg-white px-3 text-xs shadow-none"
              />
              <CustomSelect
                value={unit}
                onChange={(nextUnit) => {
                  const selectedUnit = nextUnit as ReminderUnit;
                  setUnit(selectedUnit);
                  field.onChange(toReminderMinutes(amount, selectedUnit));
                }}
                ariaLabel={copy.reminderUnit}
                options={REMINDER_UNIT_OPTIONS}
                invalid={Boolean(fieldState.error)}
                triggerClassName="h-8 rounded-xl border-slate-200/80 bg-white px-2 text-xs font-semibold text-slate-700 shadow-none hover:bg-slate-50"
                contentClassName="rounded-lg border-slate-200"
              />
            </div>
          )}
          {fieldState.error?.message && (
            <p className="text-xs text-red-600" role="alert">
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
}

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
          disabled={fields.length >= CALENDAR_MAX_REMINDERS}
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
        <ReminderRow
          key={reminder.id}
          control={control}
          index={index}
          initialMinutesBefore={reminder.minutesBefore}
          onRemove={() => remove(index)}
        />
      ))}
    </div>
  );
}
