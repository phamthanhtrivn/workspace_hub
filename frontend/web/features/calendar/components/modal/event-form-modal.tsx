"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFormValues,
  ReminderMethod,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import {
  CALENDAR_COLOR_CHOICES,
  CALENDAR_DEFAULT_EVENT_COLOR,
  CALENDAR_MIN_EVENT_DURATION_MS,
  CALENDAR_RECURRENCE_PRESET_VALUES,
  CALENDAR_REMINDER_OPTIONS,
} from "../../types/calendar.constants";
import {
  composeDateTimeLocal,
  ensureMinimumEventEndAt,
  fromDateTimeLocal,
  getDateInputValue,
  getTimeInputValue,
  hasMinimumEventDuration,
  toDateTimeLocal,
} from "../../utils/calendar-date.utils";
import {
  CalendarRecurrencePreset,
  buildCustomRecurrenceRule,
  getMonthDayName,
  getPresetRecurrenceRule,
  getRecurrencePresetFromRule,
  getWeekdayName,
  parseCustomRecurrenceRule,
} from "../../utils/calendar-recurrence.utils";
import { CustomRecurrenceModal } from "./custom-recurrence-modal";
import { CalendarColorPicker } from "../sidebar/calendar-style-fields";

export function EventFormModal({
  open,
  calendars,
  initialDraft,
  event,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  calendars: WorkspaceCalendar[];
  initialDraft: CalendarEventDraft | null;
  event?: CalendarEvent | null;
  onClose: () => void;
  onSubmit: (values: CalendarEventFormValues) => Promise<void>;
  submitting?: boolean;
}) {
  const intl = useAppIntl();
  const defaultCalendar = calendars.find((calendar) => calendar.isDefault) || calendars[0];
  const initialCalendarId =
    event?.calendarId || initialDraft?.calendarId || defaultCalendar?.id || "";
  const initialReminderMinutes = event?.reminders?.[0]?.minutesBefore ?? 10;
  const initialReminderOption = CALENDAR_REMINDER_OPTIONS.some(
    (option) => option.value === String(initialReminderMinutes),
  )
    ? String(initialReminderMinutes)
    : "custom";

  const defaultStart = useMemo(
    () => initialDraft?.startAt || new Date(),
    [initialDraft],
  );
  const defaultEnd = useMemo(() => {
    if (initialDraft?.endAt) return initialDraft.endAt;
    const next = new Date(defaultStart);
    next.setHours(next.getHours() + 1);
    return next;
  }, [defaultStart, initialDraft]);

  const [calendarId, setCalendarId] = useState(initialCalendarId);
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [startAt, setStartAt] = useState(toDateTimeLocal(event?.startAt || defaultStart));
  const [endAt, setEndAt] = useState(toDateTimeLocal(event?.endAt || defaultEnd));
  const [allDay, setAllDay] = useState(event?.allDay || initialDraft?.allDay || false);
  const [useEventColor, setUseEventColor] = useState(Boolean(event?.color));
  const [color, setColor] = useState<string | null>(event?.color || null);
  const [showCustomEventColor, setShowCustomEventColor] = useState(
    Boolean(
      event?.color &&
        !(CALENDAR_COLOR_CHOICES as readonly string[]).includes(event.color),
    ),
  );
  const [reminderOption, setReminderOption] = useState(initialReminderOption);
  const [customReminderMinutes, setCustomReminderMinutes] = useState(
    String(initialReminderMinutes),
  );
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(
    event?.recurrenceRule || null,
  );
  const [recurrencePreset, setRecurrencePreset] =
    useState<CalendarRecurrencePreset>(
      getRecurrencePresetFromRule(event?.recurrenceRule, defaultStart),
    );
  const [customRecurrence, setCustomRecurrence] = useState(
    parseCustomRecurrenceRule(event?.recurrenceRule, defaultStart),
  );
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initialEventColor = event?.color || null;

    setCalendarId(initialCalendarId);
    setTitle(event?.title || "");
    setDescription(event?.description || "");
    setLocation(event?.location || "");
    setStartAt(toDateTimeLocal(event?.startAt || defaultStart));
    setEndAt(toDateTimeLocal(event?.endAt || defaultEnd));
    setAllDay(event?.allDay || initialDraft?.allDay || false);
    setUseEventColor(Boolean(initialEventColor));
    setColor(initialEventColor);
    setShowCustomEventColor(
      Boolean(
        initialEventColor &&
          !(CALENDAR_COLOR_CHOICES as readonly string[]).includes(
            initialEventColor,
          ),
      ),
    );
    setReminderOption(initialReminderOption);
    setCustomReminderMinutes(String(initialReminderMinutes));
    setRecurrenceRule(event?.recurrenceRule || null);
    setRecurrencePreset(
      getRecurrencePresetFromRule(
        event?.recurrenceRule,
        event?.startAt ? new Date(event.startAt) : defaultStart,
      ),
    );
    setCustomRecurrence(
      parseCustomRecurrenceRule(
        event?.recurrenceRule,
        event?.startAt ? new Date(event.startAt) : defaultStart,
      ),
    );
    setShowCustomRecurrence(false);
  }, [
    defaultEnd,
    defaultStart,
    event,
    initialCalendarId,
    initialDraft?.allDay,
    initialReminderMinutes,
    initialReminderOption,
    open,
  ]);

  const handleCalendarChange = (nextCalendarId: string) => {
    setCalendarId(nextCalendarId);
  };

  const handleStartDateChange = (nextDate: string) => {
    const nextStartAt = composeDateTimeLocal(
      nextDate,
      allDay ? "00:00" : getTimeInputValue(startAt),
    );
    const nextEndAt = allDay
      ? composeDateTimeLocal(getDateInputValue(endAt), "23:59")
      : endAt;

    setStartAt(nextStartAt);
    setEndAt(
      hasMinimumEventDuration(nextStartAt, nextEndAt)
        ? nextEndAt
        : allDay
          ? composeDateTimeLocal(nextDate, "23:59")
          : ensureMinimumEventEndAt(nextStartAt, nextEndAt),
    );
  };

  const handleStartTimeChange = (nextTime: string) => {
    const nextStartAt = composeDateTimeLocal(
      getDateInputValue(startAt),
      nextTime,
    );
    setStartAt(nextStartAt);
    setEndAt(ensureMinimumEventEndAt(nextStartAt, endAt));
  };

  const handleEndDateChange = (nextDate: string) => {
    const nextEndAt = composeDateTimeLocal(
      nextDate,
      allDay ? "23:59" : getTimeInputValue(endAt),
    );
    if (!hasMinimumEventDuration(startAt, nextEndAt)) {
      toast.error(intl.formatMessage({ id: "calendar.invalidMinimumRange" }));
      return;
    }
    setEndAt(nextEndAt);
  };

  const handleEndTimeChange = (nextTime: string) => {
    const nextEndAt = composeDateTimeLocal(getDateInputValue(endAt), nextTime);
    if (!hasMinimumEventDuration(startAt, nextEndAt)) {
      toast.error(intl.formatMessage({ id: "calendar.invalidMinimumRange" }));
      return;
    }
    setEndAt(nextEndAt);
  };

  const handleAllDayChange = (checked: boolean) => {
    setAllDay(checked);
    if (!checked) return;

    const nextStartAt = composeDateTimeLocal(getDateInputValue(startAt), "00:00");
    const nextEndAt = composeDateTimeLocal(getDateInputValue(endAt), "23:59");

    setStartAt(nextStartAt);
    setEndAt(
      hasMinimumEventDuration(nextStartAt, nextEndAt)
        ? nextEndAt
        : composeDateTimeLocal(getDateInputValue(startAt), "23:59"),
    );
  };

  const handleRecurrenceChange = (nextPreset: CalendarRecurrencePreset) => {
    if (nextPreset === CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM) {
      setShowCustomRecurrence(true);
      return;
    }

    setRecurrencePreset(nextPreset);
    setRecurrenceRule(getPresetRecurrenceRule(nextPreset, new Date(startAt)));
  };

  const handleCustomRecurrenceSave = (nextRecurrence: typeof customRecurrence) => {
    setCustomRecurrence(nextRecurrence);
    setRecurrencePreset(CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM);
    setRecurrenceRule(buildCustomRecurrenceRule(nextRecurrence));
    setShowCustomRecurrence(false);
  };

  useEffect(() => {
    if (
      !open ||
      recurrencePreset === CALENDAR_RECURRENCE_PRESET_VALUES.NONE ||
      recurrencePreset === CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM
    ) {
      return;
    }

    setRecurrenceRule(
      getPresetRecurrenceRule(recurrencePreset, new Date(startAt)),
    );
  }, [open, recurrencePreset, startAt]);

  if (!open) return null;

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    if (!calendarId || !title.trim() || !startAt || !endAt) {
      toast.error(intl.formatMessage({ id: "calendar.requiredFields" }));
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      toast.error(intl.formatMessage({ id: "calendar.invalidRange" }));
      return;
    }

    if (endDate.getTime() - startDate.getTime() < CALENDAR_MIN_EVENT_DURATION_MS) {
      toast.error(intl.formatMessage({ id: "calendar.invalidMinimumRange" }));
      return;
    }

    const reminderMinutes =
      reminderOption === "custom"
        ? Number(customReminderMinutes)
        : Number(reminderOption);
    const reminders =
      Number.isFinite(reminderMinutes) && reminderMinutes >= 0
        ? [
            {
              minutesBefore: reminderMinutes,
              method: ReminderMethod.ALERT,
            },
          ]
        : [];

    await onSubmit({
      calendarId,
      title: title.trim(),
      description: description.trim() || null,
      location: location.trim() || null,
      startAt: fromDateTimeLocal(startAt),
      endAt: fromDateTimeLocal(endAt),
      allDay,
      color: useEventColor ? color : null,
      recurrenceRule,
      reminders,
    });
  };

  const recurrenceOptions = [
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.NONE,
      label: intl.formatMessage({ id: "calendar.recurrence.none" }),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.DAILY,
      label: intl.formatMessage({ id: "calendar.recurrence.daily" }),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.WEEKLY,
      label: intl.formatMessage(
        { id: "calendar.recurrence.weeklyOn" },
        { weekday: getWeekdayName(new Date(startAt), intl.locale) },
      ),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.MONTHLY,
      label: intl.formatMessage(
        { id: "calendar.recurrence.monthlyOn" },
        { day: new Date(startAt).getDate() },
      ),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.YEARLY,
      label: intl.formatMessage(
        { id: "calendar.recurrence.yearlyOn" },
        { date: getMonthDayName(new Date(startAt), intl.locale) },
      ),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.WEEKDAYS,
      label: intl.formatMessage({ id: "calendar.recurrence.weekdays" }),
    },
    {
      value: CALENDAR_RECURRENCE_PRESET_VALUES.CUSTOM,
      label: intl.formatMessage({ id: "calendar.recurrence.custom" }),
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-[var(--color-primary-dark)]">
            {intl.formatMessage({
              id: event ? "calendar.editEvent" : "calendar.createEvent",
            })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <input
            value={title}
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            placeholder={intl.formatMessage({ id: "calendar.titlePlaceholder" })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-base font-bold text-slate-800 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "nav.calendar" })}
              </span>
              <select
                value={calendarId}
                onChange={(changeEvent) =>
                  handleCalendarChange(changeEvent.target.value)
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              >
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "calendar.eventColor" })}
              </span>
              <div className="space-y-3 rounded-lg border border-slate-200 px-3 py-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={useEventColor}
                    onChange={(changeEvent) => {
                      const checked = changeEvent.target.checked;
                      setUseEventColor(checked);
                      if (checked && color === null) {
                        setColor(CALENDAR_DEFAULT_EVENT_COLOR);
                        setShowCustomEventColor(false);
                      }
                    }}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300"
                  />
                  {intl.formatMessage({ id: "calendar.useEventColor" })}
                </label>
                {useEventColor && color !== null && (
                  <CalendarColorPicker
                    value={color}
                    showCustomColor={showCustomEventColor}
                    onChange={setColor}
                    onShowCustomColor={setShowCustomEventColor}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={getDateInputValue(startAt)}
                onChange={(changeEvent) =>
                  handleStartDateChange(changeEvent.target.value)
                }
                className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
              {!allDay && (
                <input
                  type="time"
                  value={getTimeInputValue(startAt)}
                  onChange={(changeEvent) =>
                    handleStartTimeChange(changeEvent.target.value)
                  }
                  className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                />
              )}
              <span className="px-1 text-sm font-black text-slate-400">
                {intl.formatMessage({ id: "calendar.to" })}
              </span>
              {!allDay && (
                <input
                  type="time"
                  value={getTimeInputValue(endAt)}
                  onChange={(changeEvent) =>
                    handleEndTimeChange(changeEvent.target.value)
                  }
                  className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                />
              )}
              <input
                type="date"
                value={getDateInputValue(endAt)}
                onChange={(changeEvent) =>
                  handleEndDateChange(changeEvent.target.value)
                }
                className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-600">
                <input
                  type="checkbox"
                  checked={allDay}
                  onChange={(changeEvent) =>
                    handleAllDayChange(changeEvent.target.checked)
                  }
                  className="h-4 w-4 cursor-pointer rounded border-slate-300"
                />
                {intl.formatMessage({ id: "calendar.allDay" })}
              </label>
              <select
                value={recurrencePreset}
                onChange={(event) =>
                  handleRecurrenceChange(
                    event.target.value as CalendarRecurrencePreset,
                  )
                }
                className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              >
                {recurrenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "calendar.location" })}
              </span>
              <input
                value={location}
                onChange={(changeEvent) => setLocation(changeEvent.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "calendar.reminder" })}
              </span>
              <input
                type="hidden"
                value={customReminderMinutes}
                readOnly
              />
              <select
                value={reminderOption}
                onChange={(changeEvent) => setReminderOption(changeEvent.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              >
                {CALENDAR_REMINDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {intl.formatMessage({ id: option.labelId })}
                  </option>
                ))}
              </select>
              {reminderOption === "custom" && (
                <input
                  type="number"
                  min={0}
                  value={customReminderMinutes}
                  onChange={(changeEvent) =>
                    setCustomReminderMinutes(changeEvent.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                />
              )}
            </label>
          </div>

          <textarea
            value={description}
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            placeholder={intl.formatMessage({ id: "calendar.descriptionPlaceholder" })}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />
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
            type="submit"
            disabled={submitting}
            className="cursor-pointer rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? intl.formatMessage({ id: "app.saving" })
              : intl.formatMessage({ id: "app.save" })}
          </button>
        </div>
      </form>
      <CustomRecurrenceModal
        open={showCustomRecurrence}
        value={customRecurrence}
        onClose={() => setShowCustomRecurrence(false)}
        onSave={handleCustomRecurrenceSave}
      />
    </div>
  );
}
