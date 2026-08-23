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
  const [color, setColor] = useState(event?.color || defaultCalendar?.color || "#2563eb");
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
  const [reminderMinutes, setReminderMinutes] = useState(
    String(event?.reminders?.[0]?.minutesBefore ?? 10),
  );

  useEffect(() => {
    if (!open) return;
    setCalendarId(initialCalendarId);
    setTitle(event?.title || "");
    setDescription(event?.description || "");
    setLocation(event?.location || "");
    setStartAt(toDateTimeLocal(event?.startAt || defaultStart));
    setEndAt(toDateTimeLocal(event?.endAt || defaultEnd));
    setAllDay(event?.allDay || initialDraft?.allDay || false);
    setColor(event?.color || defaultCalendar?.color || "#2563eb");
    setVisibility(event?.visibility || EventVisibility.DEFAULT);
    setRecurrenceRule(event?.recurrenceRule || "");
    setAttendees(
      event?.attendees?.map((attendee) => ({
        userId: attendee.userId,
        optional: attendee.optional,
      })) || [],
    );
    setReminderMinutes(String(event?.reminders?.[0]?.minutesBefore ?? 10));
  }, [defaultCalendar?.color, defaultEnd, defaultStart, event, initialCalendarId, initialDraft?.allDay, open]);

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

    const reminders =
      Number(reminderMinutes) >= 0
        ? [
            {
              minutesBefore: Number(reminderMinutes),
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
      color,
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
                onChange={(changeEvent) => setCalendarId(changeEvent.target.value)}
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
                {intl.formatMessage({ id: "calendar.color" })}
              </span>
              <input
                type="color"
                value={color || "#2563eb"}
                onChange={(changeEvent) => setColor(changeEvent.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white p-1"
              />
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
                type="number"
                min={0}
                value={reminderMinutes}
                onChange={(changeEvent) => setReminderMinutes(changeEvent.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-xs font-black uppercase text-slate-400">
              {intl.formatMessage({ id: "calendar.visibility" })}
            </span>
            <select
              value={visibility}
              onChange={(changeEvent) =>
                setVisibility(changeEvent.target.value as EventVisibility)
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
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

          <textarea
            value={description}
            onChange={(changeEvent) => setDescription(changeEvent.target.value)}
            placeholder={intl.formatMessage({ id: "calendar.descriptionPlaceholder" })}
            rows={3}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />

          <input
            value={recurrenceRule}
            onChange={(changeEvent) => setRecurrenceRule(changeEvent.target.value)}
            placeholder={intl.formatMessage({ id: "calendar.recurrencePlaceholder" })}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-[var(--color-secondary)] focus:ring-4 focus:ring-blue-100"
          />

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
