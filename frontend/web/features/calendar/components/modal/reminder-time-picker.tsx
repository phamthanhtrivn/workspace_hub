"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";
import { CALENDAR_MAX_REMINDER_MINUTES_BEFORE } from "../../types/calendar.constants";
import {
  formatReminderOptionLabel,
  getCustomReminderParts,
  REMINDER_PRESETS,
  REMINDER_UNIT_MINUTES,
  toReminderMinutes,
  type ReminderUnit,
} from "../../utils/calendar-reminder.utils";

interface ReminderTimePickerProps {
  value: number;
  onChange: (minutes: number) => void;
  isTaken: (minutes: number) => boolean;
  error?: string;
}

export function ReminderTimePicker({
  value,
  onChange,
  isTaken,
  error,
}: ReminderTimePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<ReminderUnit>("minutes");
  const minutes = toReminderMinutes(amount, unit);
  const valid =
    Number.isFinite(minutes) &&
    minutes >= 0 &&
    minutes <= CALENDAR_MAX_REMINDER_MINUTES_BEFORE;
  const warning = !valid
    ? minutes > CALENDAR_MAX_REMINDER_MINUTES_BEFORE
      ? copy.reminderTooEarly
      : copy.reminderInvalidAmount
    : isTaken(minutes)
      ? copy.reminderDuplicate
      : undefined;
  const apply = (next: number) => {
    if (isTaken(next) || !Number.isFinite(next)) return;
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="min-w-0">
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) {
            const parts = getCustomReminderParts(value);
            setAmount(String(parts.amount));
            setUnit(parts.unit);
          }
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={copy.reminderTime}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-9 w-full min-w-0 justify-between gap-2 rounded-control border-input bg-card px-3 text-xs font-medium shadow-none"
          >
            <span className="truncate">{formatReminderOptionLabel(value)}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          collisionPadding={16}
          className="w-80 max-w-[calc(100vw-2rem)] p-3"
        >
          <div
            className="grid grid-cols-2 gap-1.5"
            aria-label={copy.reminderTime}
          >
            {REMINDER_PRESETS.map((preset) => {
              const taken = isTaken(preset.value);

              return (
                <Button
                  key={preset.value}
                  type="button"
                  variant="ghost"
                  disabled={taken}
                  aria-pressed={value === preset.value}
                  onClick={() => apply(preset.value)}
                  className="h-auto min-h-9 justify-start rounded-control px-2 py-2 text-xs aria-pressed:bg-accent"
                >
                  <span className="flex flex-col items-start">
                    <span>{preset.label}</span>
                    {taken && (
                      <span className="text-[11px] font-normal">
                        {copy.reminderAlreadyAdded}
                      </span>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <p className="mb-2 text-xs font-semibold">
              {copy.reminderCustomHeading}
            </p>
            <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
              <Input
                id={`${id}-amount`}
                type="number"
                min={0}
                step={1}
                max={Math.floor(
                  CALENDAR_MAX_REMINDER_MINUTES_BEFORE /
                    REMINDER_UNIT_MINUTES[unit],
                )}
                value={amount}
                aria-label={copy.reminderAmount}
                aria-invalid={Boolean(warning)}
                aria-describedby={warning ? `${id}-warning` : `${id}-hint`}
                onChange={(event) => setAmount(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (!warning) apply(minutes);
                  }
                }}
                className="h-9 rounded-control text-sm tabular-nums"
              />
              <CustomSelect
                value={unit}
                onChange={setUnit}
                ariaLabel={copy.reminderUnit}
                options={Object.keys(REMINDER_UNIT_MINUTES).map((value) => ({
                  value: value as ReminderUnit,
                  label: {
                    minutes: copy.reminderMinutes,
                    hours: copy.reminderHours,
                    days: copy.reminderDays,
                    weeks: copy.reminderWeeks,
                  }[value as ReminderUnit],
                }))}
              />
            </div>
            <p
              id={`${id}-hint`}
              className="mt-1.5 text-xs text-muted-foreground"
            >
              {copy.reminderBeforeStart}
            </p>
            {warning && (
              <p
                id={`${id}-warning`}
                role="alert"
                className="mt-2 text-xs text-destructive-content"
              >
                {warning}
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={Boolean(warning)}
                onClick={() => apply(minutes)}
              >
                {copy.reminderApply}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-xs text-destructive-content"
        >
          {error}
        </p>
      )}
    </div>
  );
}
