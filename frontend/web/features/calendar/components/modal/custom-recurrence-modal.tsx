"use client";

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
} from "../../constants/calendar-form-copy";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { CalendarRadioGroup } from "../ui/calendar-radio-group";
import {
  CALENDAR_RECURRENCE_FREQUENCY_OPTIONS,
  CALENDAR_RECURRENCE_WEEKDAY_OPTIONS,
} from "../../types/calendar.constants";
import {
  CalendarCustomRecurrence,
  CalendarRecurrenceEndType,
  CalendarRecurrenceWeekday,
} from "../../types/calendar.types";

export function CustomRecurrenceModal({
  open,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  value: CalendarCustomRecurrence;
  onClose: () => void;
  onSave: (value: CalendarCustomRecurrence) => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);
  useModalDialog({ dialogRef, onClose, lockDocumentScroll: false });

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

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-custom-recurrence-heading"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3
            id="calendar-custom-recurrence-heading"
            className="text-lg font-black text-[var(--color-primary-dark)]"
          >
            {copy.customRecurrence}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={copy.close}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-500">
              {copy.recurrenceRepeatEvery}
            </span>
            <Input
              data-modal-initial-focus
              type="number"
              min={1}
              value={draft.interval}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  interval: Math.max(1, Number(event.target.value) || 1),
                }))
              }
              className="h-11 w-20 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 shadow-none outline-none focus-visible:border-[var(--color-secondary)] focus-visible:ring-4 focus-visible:ring-blue-100"
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
              triggerClassName="h-11 rounded-lg border-slate-200 px-3 text-sm font-bold text-slate-700 shadow-none"
              contentClassName="rounded-lg border-slate-200"
            />
          </div>

          {draft.frequency === "WEEKLY" && (
            <div className="space-y-3">
              <span className="text-sm font-bold text-slate-500">
                {copy.recurrenceRepeatOn}
              </span>
              <div className="flex flex-wrap gap-2">
                {CALENDAR_RECURRENCE_WEEKDAY_OPTIONS.map((weekday) => {
                  const selected = draft.weekdays.includes(weekday.value);

                  return (
                    <Button
                      key={weekday.value}
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleWeekday(weekday.value)}
                      className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full text-xs font-black transition ${
                        selected
                          ? "bg-[var(--color-secondary)] text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
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
            <span className="text-sm font-bold text-slate-500">
              {copy.recurrenceEnds}
            </span>
            <CalendarRadioGroup<CalendarRecurrenceEndType>
              name="recurrenceEndType"
              ariaLabel={copy.recurrenceEnds}
              value={draft.endType}
              onChange={(endType) =>
                setDraft((current) => ({ ...current, endType }))
              }
              options={(["never", "on", "after"] as CalendarRecurrenceEndType[]).map(
                (endType) => ({
                  value: endType,
                  label: CALENDAR_FORM_RECURRENCE_END_LABELS[endType],
                }),
              )}
              optionClassName="text-sm font-bold"
            />
            {draft.endType === "on" && (
              <Input
                type="date"
                value={draft.until || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    until: event.target.value,
                  }))
                }
                className="h-10 rounded-lg border-slate-200 px-3 text-sm font-bold text-slate-700 shadow-none"
              />
            )}
            {draft.endType === "after" && (
              <Input
                type="number"
                min={1}
                value={draft.count || 1}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    count: Math.max(1, Number(event.target.value) || 1),
                  }))
                }
                className="h-10 w-24 rounded-lg border-slate-200 px-3 text-sm font-bold text-slate-700 shadow-none"
              />
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            {copy.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className="cursor-pointer rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary)]"
          >
            {copy.done}
          </Button>
        </div>
      </div>
    </div>
  );
}
