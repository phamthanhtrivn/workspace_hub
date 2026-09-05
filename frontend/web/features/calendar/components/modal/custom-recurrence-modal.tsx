"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import {
  CALENDAR_RECURRENCE_FREQUENCY_OPTIONS,
  CALENDAR_RECURRENCE_WEEKDAY_OPTIONS,
} from "../../types/calendar.constants";
import {
  CalendarCustomRecurrence,
  CalendarRecurrenceEndType,
  CalendarRecurrenceFrequency,
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
  const intl = useAppIntl();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);
  useModalDialog({ dialogRef, onClose });

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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
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
            {intl.formatMessage({ id: "calendar.recurrence.customTitle" })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={intl.formatMessage({ id: "app.close" })}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-500">
              {intl.formatMessage({ id: "calendar.recurrence.repeatEvery" })}
            </span>
            <input
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
              className="h-11 w-20 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
            />
            <select
              value={draft.frequency}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  frequency: event.target.value as CalendarRecurrenceFrequency,
                }))
              }
              className="h-11 min-w-32 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
            >
              {CALENDAR_RECURRENCE_FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {intl.formatMessage({ id: option.labelId })}
                </option>
              ))}
            </select>
          </div>

          {draft.frequency === "WEEKLY" && (
            <div className="space-y-3">
              <span className="text-sm font-bold text-slate-500">
                {intl.formatMessage({ id: "calendar.recurrence.repeatOn" })}
              </span>
              <div className="flex flex-wrap gap-2">
                {CALENDAR_RECURRENCE_WEEKDAY_OPTIONS.map((weekday) => {
                  const selected = draft.weekdays.includes(weekday.value);

                  return (
                    <button
                      key={weekday.value}
                      type="button"
                      onClick={() => toggleWeekday(weekday.value)}
                      className={`grid h-9 w-9 cursor-pointer place-items-center rounded-full text-xs font-black transition ${
                        selected
                          ? "bg-[var(--color-secondary)] text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {intl.formatMessage({ id: weekday.labelId })}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <span className="text-sm font-bold text-slate-500">
              {intl.formatMessage({ id: "calendar.recurrence.ends" })}
            </span>
            {(["never", "on", "after"] as CalendarRecurrenceEndType[]).map(
              (endType) => (
                <label
                  key={endType}
                  className="flex cursor-pointer items-center gap-3 text-sm font-bold text-slate-600"
                >
                  <input
                    type="radio"
                    name="recurrenceEndType"
                    checked={draft.endType === endType}
                    onChange={() =>
                      setDraft((current) => ({ ...current, endType }))
                    }
                    className="h-4 w-4 cursor-pointer"
                  />
                  <span className="w-24">
                    {intl.formatMessage({
                      id: `calendar.recurrence.ends.${endType}`,
                    })}
                  </span>
                  {endType === "on" && (
                    <input
                      type="date"
                      value={draft.until || ""}
                      disabled={draft.endType !== "on"}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          until: event.target.value,
                        }))
                      }
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  )}
                  {endType === "after" && (
                    <input
                      type="number"
                      min={1}
                      value={draft.count || 1}
                      disabled={draft.endType !== "after"}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          count: Math.max(1, Number(event.target.value) || 1),
                        }))
                      }
                      className="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  )}
                </label>
              ),
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="cursor-pointer rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary)]"
          >
            {intl.formatMessage({ id: "app.done" })}
          </button>
        </div>
      </div>
    </div>
  );
}
