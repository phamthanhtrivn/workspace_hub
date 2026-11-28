"use client";

import { Bell, Plus, Trash2 } from "lucide-react";
import {
  type Control,
  Controller,
  useFieldArray,
  useWatch,
} from "react-hook-form";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { type CalendarEventEditorValues } from "../../schemas/calendar-event-form.schema";
import { CALENDAR_MAX_REMINDERS } from "../../types/calendar.constants";
import { ReminderMethod } from "../../types/calendar.types";
import {
  isDuplicateReminder,
  nextAvailableReminder,
} from "../../utils/calendar-reminder-policy";
import { ReminderTimePicker } from "./reminder-time-picker";

export function ReminderEditor({
  control,
}: {
  control: Control<CalendarEventEditorValues>;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "reminders",
  });
  const reminders = useWatch({ control, name: "reminders" }) ?? [];

  return (
    <div className="min-w-0 space-y-3 rounded-panel border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Bell aria-hidden="true" className="size-3.5" />
          {copy.reminders}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={fields.length >= CALENDAR_MAX_REMINDERS}
          onClick={() => append(nextAvailableReminder(reminders))}
          className="h-8 gap-1 px-1 text-xs text-info-content hover:bg-transparent hover:text-info-content"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          {copy.add}
        </Button>
      </div>
      {fields.map((reminder, index) => (
        <div
          key={reminder.id}
          className="grid grid-cols-[minmax(4.5rem,0.7fr)_minmax(0,1.3fr)_2rem] items-start gap-2"
        >
          <Controller
            control={control}
            name={`reminders.${index}.method`}
            render={({ field }) => (
              <CustomSelect
                value={field.value}
                ariaLabel={copy.reminderType}
                onChange={(method) => {
                  if (
                    !isDuplicateReminder(
                      reminders,
                      { method, minutesBefore: reminders[index].minutesBefore },
                      index,
                    )
                  )
                    field.onChange(method);
                }}
                options={Object.values(ReminderMethod).map((method) => {
                  const taken = isDuplicateReminder(
                    reminders,
                    { method, minutesBefore: reminders[index]?.minutesBefore },
                    index,
                  );

                  return {
                    value: method,
                    disabled: taken,
                    label: (
                      <span>
                        {method}
                        {taken && (
                          <span className="ml-1 text-muted-foreground">
                            · {copy.reminderAlreadyAdded}
                          </span>
                        )}
                      </span>
                    ),
                  };
                })}
                triggerClassName="h-9 rounded-control border-input bg-card px-2 text-xs shadow-none"
              />
            )}
          />
          <Controller
            control={control}
            name={`reminders.${index}.minutesBefore`}
            render={({ field, fieldState }) => (
              <ReminderTimePicker
                value={field.value}
                error={fieldState.error?.message}
                onChange={field.onChange}
                isTaken={(minutesBefore) =>
                  isDuplicateReminder(
                    reminders,
                    { method: reminders[index]?.method, minutesBefore },
                    index,
                  )
                }
              />
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            aria-label={`${copy.delete} ${copy.reminders.toLowerCase()} ${index + 1}`}
            className="h-9 w-8 rounded-control text-muted-foreground hover:bg-destructive-soft hover:text-destructive-content"
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
