"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  CalendarEvent,
  CalendarEventAttendeePayload,
  CalendarEventDraft,
  CalendarEventFormValues,
  EventVisibility,
  ReminderMethod,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import {
  CALENDAR_COLOR_CHOICES,
  CALENDAR_DEFAULT_EVENT_COLOR,
  CALENDAR_RECURRENCE_OPTIONS,
  CALENDAR_REMINDER_OPTIONS,
} from "../../types/calendar.constants";
import {
  fromDateTimeLocal,
  toDateTimeLocal,
} from "../../utils/calendar-date.utils";
import { AttendeePicker } from "../attendee-picker/attendee-picker";

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
  const selectedCalendar =
    calendars.find((calendar) => calendar.id === calendarId) || defaultCalendar;
  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [startAt, setStartAt] = useState(toDateTimeLocal(event?.startAt || defaultStart));
  const [endAt, setEndAt] = useState(toDateTimeLocal(event?.endAt || defaultEnd));
  const [allDay, setAllDay] = useState(event?.allDay || initialDraft?.allDay || false);
  const [useCustomColor, setUseCustomColor] = useState(Boolean(event?.color));
  const [color, setColor] = useState(
    event?.color || selectedCalendar?.color || CALENDAR_DEFAULT_EVENT_COLOR,
  );
  const [visibility, setVisibility] = useState(
    event?.visibility || EventVisibility.DEFAULT,
  );
  const [recurrenceRule, setRecurrenceRule] = useState(event?.recurrenceRule || "");
  const [attendees, setAttendees] = useState<CalendarEventAttendeePayload[]>(
    event?.attendees?.map((attendee) => ({
      userId: attendee.userId,
      optional: attendee.optional,
    })) || [],
  );
  const [reminderOption, setReminderOption] = useState(initialReminderOption);
  const [customReminderMinutes, setCustomReminderMinutes] = useState(
    String(initialReminderMinutes),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCalendarId(initialCalendarId);
    setTitle(event?.title || "");
    setDescription(event?.description || "");
    setLocation(event?.location || "");
    setStartAt(toDateTimeLocal(event?.startAt || defaultStart));
    setEndAt(toDateTimeLocal(event?.endAt || defaultEnd));
    setAllDay(event?.allDay || initialDraft?.allDay || false);
    setUseCustomColor(Boolean(event?.color));
    setColor(
      event?.color || selectedCalendar?.color || CALENDAR_DEFAULT_EVENT_COLOR,
    );
    setVisibility(event?.visibility || EventVisibility.DEFAULT);
    setRecurrenceRule(event?.recurrenceRule || "");
    setAttendees(
      event?.attendees?.map((attendee) => ({
        userId: attendee.userId,
        optional: attendee.optional,
      })) || [],
    );
    setReminderOption(initialReminderOption);
    setCustomReminderMinutes(String(initialReminderMinutes));
    setShowAdvanced(
      Boolean(
        (event?.visibility && event.visibility !== EventVisibility.DEFAULT) ||
          event?.recurrenceRule,
      ),
    );
  }, [
    defaultEnd,
    defaultStart,
    event,
    initialCalendarId,
    initialDraft?.allDay,
    initialReminderMinutes,
    initialReminderOption,
    open,
    selectedCalendar?.color,
  ]);

  const handleCalendarChange = (nextCalendarId: string) => {
    setCalendarId(nextCalendarId);
    if (useCustomColor) return;

    const nextCalendar = calendars.find(
      (calendar) => calendar.id === nextCalendarId,
    );
    setColor(nextCalendar?.color || CALENDAR_DEFAULT_EVENT_COLOR);
  };

  if (!open) return null;

  const handleSubmit = async (submitEvent: FormEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();

    if (!calendarId || !title.trim() || !startAt || !endAt) {
      toast.error(intl.formatMessage({ id: "calendar.requiredFields" }));
      return;
    }

    if (new Date(endAt) <= new Date(startAt)) {
      toast.error(intl.formatMessage({ id: "calendar.invalidRange" }));
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
      color: useCustomColor ? color : null,
      visibility,
      recurrenceRule: recurrenceRule.trim() || null,
      attendees,
      reminders,
    });
  };

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
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
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

          <div className="grid gap-4 md:grid-cols-2">
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
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "calendar.eventColor" })}
              </span>
              <div className="rounded-lg border border-slate-200 px-3 py-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={useCustomColor}
                    onChange={(changeEvent) => {
                      setUseCustomColor(changeEvent.target.checked);
                      if (!changeEvent.target.checked) {
                        setColor(
                          selectedCalendar?.color ||
                            CALENDAR_DEFAULT_EVENT_COLOR,
                        );
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {intl.formatMessage({ id: "calendar.customEventColor" })}
                </label>
                {!useCustomColor ? (
                  <div className="mt-2 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{
                        backgroundColor:
                          selectedCalendar?.color ||
                          CALENDAR_DEFAULT_EVENT_COLOR,
                      }}
                    />
                    {intl.formatMessage({ id: "calendar.useCalendarColor" })}
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-6 gap-2">
                      {CALENDAR_COLOR_CHOICES.map((choice) => (
                        <button
                          key={choice}
                          type="button"
                          onClick={() => setColor(choice)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                          style={{ backgroundColor: choice }}
                          aria-label={choice}
                        >
                          {color === choice && (
                            <span className="h-2.5 w-2.5 rounded-full bg-white" />
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={color || CALENDAR_DEFAULT_EVENT_COLOR}
                        onChange={(changeEvent) => setColor(changeEvent.target.value)}
                        className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1"
                      />
                      <input
                        value={color}
                        onChange={(changeEvent) => setColor(changeEvent.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "calendar.start" })}
              </span>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(changeEvent) => setStartAt(changeEvent.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-400">
                {intl.formatMessage({ id: "calendar.end" })}
              </span>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(changeEvent) => setEndAt(changeEvent.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(changeEvent) => setAllDay(changeEvent.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {intl.formatMessage({ id: "calendar.allDay" })}
          </label>

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

          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="text-sm font-black text-[var(--color-primary)]"
          >
            {intl.formatMessage({ id: "calendar.moreOptions" })}
          </button>

          {showAdvanced && (
            <div className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-400">
                  {intl.formatMessage({ id: "calendar.recurrence" })}
                </span>
                <select
                  value={recurrenceRule}
                  onChange={(changeEvent) =>
                    setRecurrenceRule(changeEvent.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                >
                  {CALENDAR_RECURRENCE_OPTIONS.map((option) => (
                    <option key={option.value || "none"} value={option.value}>
                      {intl.formatMessage({ id: option.labelId })}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black uppercase text-slate-400">
                  {intl.formatMessage({ id: "calendar.visibility" })}
                </span>
                <select
                  value={visibility}
                  onChange={(changeEvent) =>
                    setVisibility(changeEvent.target.value as EventVisibility)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
                >
                  <option value={EventVisibility.DEFAULT}>
                    {intl.formatMessage({ id: "calendar.visibility.default" })}
                  </option>
                  <option value={EventVisibility.PRIVATE}>
                    {intl.formatMessage({ id: "calendar.visibility.private" })}
                  </option>
                  <option value={EventVisibility.PUBLIC}>
                    {intl.formatMessage({ id: "calendar.visibility.public" })}
                  </option>
                </select>
              </label>
            </div>
          )}

          <AttendeePicker attendees={attendees} onChange={setAttendees} />
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            {intl.formatMessage({ id: "app.cancel" })}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[var(--color-primary-dark)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? intl.formatMessage({ id: "app.saving" })
              : intl.formatMessage({ id: "app.save" })}
          </button>
        </div>
      </form>
    </div>
  );
}
