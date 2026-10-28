"use client";
import { CustomDatePicker } from "@/components/ui/custom/custom-date-picker";




import { useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom/custom-select";
import { Input } from "@/components/ui/input";
import {
  CALENDAR_FORM_COPY as copy,
  CALENDAR_FORM_RECURRENCE_END_LABELS,
  CALENDAR_FORM_RECURRENCE_UNITS,
  CALENDAR_FORM_WEEKDAY_INITIALS,
  CALENDAR_FORM_LOCALE,
} from "../../constants/calendar-form-copy";

import {
  CALENDAR_RECURRENCE_FREQUENCY_OPTIONS,
  CALENDAR_RECURRENCE_WEEKDAY_OPTIONS,
  CALENDAR_MAX_RECURRENCE_INTERVAL,
  CALENDAR_MAX_RECURRENCE_COUNT,
} from "../../types/calendar.constants";
import {
  CalendarCustomRecurrence,
  CalendarRecurrenceEndType,
  CalendarRecurrenceWeekday,
} from "../../types/calendar.types";
import { getWeekdayNameByCode } from "../../utils/calendar-recurrence.utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DialogSurface } from "@/components/ui/dialog";


export function CustomRecurrenceModal({
  open,
  value,
  onClose,
  onSave,
  startDate,
}: {
  open: boolean;
  value: CalendarCustomRecurrence;
  onClose: () => void;
  onSave: (value: CalendarCustomRecurrence) => void;
  startDate: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(() => ({
    ...value,
    until: value.until || startDate,
    count: value.count || 1,
  }));
  const [error, setError] = useState<string | null>(null);


  if (!open) return null;

  const toggleWeekday = (weekday: CalendarRecurrenceWeekday) => {
    setDraft((current) => {
      const nextWeekdays = current.weekdays.includes(weekday)
        ? current.weekdays.filter((item) => item !== weekday)
        : [...current.weekdays, weekday];

      return {
        ...current,
        weekdays: nextWeekdays.length > 0 ? nextWeekdays : [weekday],
      };
    });
  };

  const handleSave = () => {
    if (
      !Number.isInteger(draft.interval) ||
      draft.interval < 1 ||
      draft.interval > CALENDAR_MAX_RECURRENCE_INTERVAL ||
      (draft.endType === "after" &&
        (!Number.isInteger(draft.count) ||
          draft.count < 1 ||
          draft.count > CALENDAR_MAX_RECURRENCE_COUNT)) ||
      (draft.endType === "on" && (!draft.until || draft.until < startDate))
    ) {
      setError(copy.recurrenceInvalid);
      return;
    }
    onSave({
      ...draft,
      interval: Math.max(1, Number(draft.interval) || 1),
      count:
        draft.endType === "after"
          ? Math.max(1, Number(draft.count) || 1)
          : undefined,
      until: draft.endType === "on" ? draft.until : undefined,
    });
  };

  return typeof document === "undefined" ? null : <DialogSurface onClose={onClose}>{(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-overlay/60 p-4"
      onWheelCapture={(event) => {
        if (
          event.target instanceof Node &&
          dialogRef.current?.contains(event.target)
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
      onTouchMoveCapture={(event) => {
        if (
          event.target instanceof Node &&
          dialogRef.current?.contains(event.target)
        ) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <div
        ref={dialogRef}


        aria-labelledby="calendar-custom-recurrence-heading"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-panel border border-border bg-card"
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h3
            id="calendar-custom-recurrence-heading"
            className="text-section-title font-semibold text-foreground"
          >
            {copy.customRecurrence}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={copy.close}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-control text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-6 px-6 py-5">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="calendar-recurrence-interval"
              className="text-sm font-semibold text-muted-foreground"
            >
              {copy.recurrenceRepeatEvery}
            </label>
            <Input
              id="calendar-recurrence-interval"
              data-modal-initial-focus
              type="number"
              min={1}
              max={CALENDAR_MAX_RECURRENCE_INTERVAL}
              step={1}
              value={draft.interval}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  interval: Number(event.target.value),
                }))
              }
              className="h-11 w-20 rounded-control border border-input px-3 text-sm font-semibold text-foreground shadow-none outline-none"
            />
            <CustomSelect
              value={draft.frequency}
              onChange={(frequency) =>
                setDraft((current) => ({
                  ...current,
                  frequency,
                }))
              }
              ariaLabel={copy.recurrenceRepeatEvery}
              options={CALENDAR_RECURRENCE_FREQUENCY_OPTIONS.map((option) => ({
                value: option.value,
                label: CALENDAR_FORM_RECURRENCE_UNITS[option.value],
              }))}
              className="min-w-32"
              triggerClassName="h-11 rounded-lg border-input px-3 text-sm font-semibold text-foreground shadow-none"
              contentClassName="rounded-lg border-border"
            />
          </div>

          {draft.frequency === "WEEKLY" && (
            <div className="space-y-3">
              <span className="text-sm font-semibold text-muted-foreground">
                {copy.recurrenceRepeatOn}
              </span>
              <div className="flex flex-wrap gap-1 sm:gap-2">
                {CALENDAR_RECURRENCE_WEEKDAY_OPTIONS.map((weekday) => {
                  const selected = draft.weekdays.includes(weekday.value);

                  return (
                    <Button
                      key={weekday.value}
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleWeekday(weekday.value)}
                      aria-pressed={selected}
                      aria-label={getWeekdayNameByCode(weekday.value, CALENDAR_FORM_LOCALE)}
                      className={`grid h-7 w-7 cursor-pointer place-items-center rounded-full text-xs font-semibold transition sm:h-9 sm:w-9 ${
                        selected
                          ? "bg-primary-soft text-primary-soft-foreground"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {CALENDAR_FORM_WEEKDAY_INITIALS[weekday.value]}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-sm font-semibold text-muted-foreground">
              {copy.recurrenceEnds}
            </span>
            <RadioGroup name="recurrenceEndType" value={draft.endType} onValueChange={(endType: CalendarRecurrenceEndType) => setDraft((current) => ({ ...current, endType }))}
              aria-label={copy.recurrenceEnds}
              className="space-y-3"
            >
              {(["never", "on", "after"] as CalendarRecurrenceEndType[]).map(
                (endType) => (
                  <div
                    key={endType}
                    className="grid min-h-11 grid-cols-1 items-center gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]"
                  >
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-foreground">
                      <RadioGroupItem

                        value={endType}
                        className="h-4 w-4 shrink-0 accent-link"
                      />
                      {CALENDAR_FORM_RECURRENCE_END_LABELS[endType]}
                    </label>
                    {endType === "on" && (
                      <CustomDatePicker
                        ariaLabel={copy.endDate}
                        min={startDate}
                        disabled={draft.endType !== "on"}
                        value={draft.until}
                        onChange={nextValue =>
                          setDraft((current) => ({
                            ...current,
                            until: nextValue,
                          }))
                        }
                        triggerClassName="h-11 min-w-0 rounded-control border-input px-3 text-sm font-semibold text-foreground shadow-none disabled:bg-muted"
                        allowClear
                      />
                    )}
                    {endType === "after" && (
                      <div
                        className={`flex min-w-0 items-center gap-2 ${draft.endType !== "after" ? "opacity-50" : ""}`}
                      >
                        <Input
                          type="number"
                          aria-label={copy.recurrenceOccurrences}
                          min={1}
                          max={CALENDAR_MAX_RECURRENCE_COUNT}
                          step={1}
                          disabled={draft.endType !== "after"}
                          value={draft.count}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              count: Number(event.target.value),
                            }))
                          }
                          className="h-11 w-20 shrink-0 rounded-control border-input px-3 text-sm font-semibold text-foreground shadow-none disabled:bg-muted"
                        />
                        <span className="text-xs font-semibold text-muted-foreground">
                          {copy.recurrenceOccurrences}
                        </span>
                      </div>
                    )}
                  </div>
                ),
              )}
            </RadioGroup>
            {error && (
              <p role="alert" className="text-sm text-destructive-content">
                {error}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 pb-5 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="cursor-pointer rounded-control border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-background"
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="cursor-pointer rounded-control bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary"
          >
            {copy.done}
          </Button>
        </div>
      </div>
    </div>
  )}</DialogSurface>;
}
