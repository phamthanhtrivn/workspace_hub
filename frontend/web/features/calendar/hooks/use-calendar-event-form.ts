import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import {
  CalendarEventEditorValues,
  calendarEventFormSchema,
} from "../schemas/calendar-event-form.schema";
import { CALENDAR_DEFAULT_EVENT_COLOR } from "../types/calendar.constants";
import {
  CalendarEvent,
  CalendarEventAttendeePayload,
  CalendarEventDraft,
  CalendarEventFormValues,
  WorkspaceCalendar,
} from "../types/calendar.types";
import { fromDateTimeLocal } from "../utils/calendar-date.utils";
import { createCalendarEventFormDefaults } from "../utils/calendar-event-form.utils";
import { useCalendarEventTime } from "./use-calendar-event-time";
import { useCalendarRecurrence } from "./use-calendar-recurrence";

interface UseCalendarEventFormInput {
  calendars: WorkspaceCalendar[];
  draft: CalendarEventDraft | null;
  event?: CalendarEvent | null;
  onSubmit: (values: CalendarEventFormValues) => Promise<void>;
}

export function useCalendarEventForm({
  calendars,
  draft,
  event,
  onSubmit,
}: UseCalendarEventFormInput) {
  const intl = useAppIntl();
  const defaultCalendar =
    calendars.find((calendar) => calendar.isDefault) ?? calendars[0];
  const [defaults] = useState(() =>
    createCalendarEventFormDefaults({
      calendarId: defaultCalendar?.id ?? "",
      draft,
      event,
    }),
  );
  const form = useForm<CalendarEventEditorValues>({
    resolver: zodResolver(calendarEventFormSchema),
    defaultValues: defaults.values,
  });
  const [attendees, setAttendees] = useState(defaults.attendees);
  const [showCustomEventColor, setShowCustomEventColor] = useState(
    defaults.showCustomEventColor,
  );
  const time = useCalendarEventTime(form);
  const recurrence = useCalendarRecurrence(
    time.startAt,
    defaults.defaultStart,
    event,
  );

  const submitValidForm = async (values: CalendarEventEditorValues) => {
    await onSubmit({
      calendarId: values.calendarId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      startAt: fromDateTimeLocal(values.startAt),
      endAt: fromDateTimeLocal(values.endAt),
      allDay: values.allDay,
      color: values.useEventColor ? values.color : null,
      recurrenceRule: recurrence.getRecurrenceRule(values.startAt),
      recurrenceScope: event ? values.recurrenceScope : undefined,
      attendees,
      reminders: values.reminders.filter(
        (reminder) =>
          Number.isFinite(reminder.minutesBefore) &&
          reminder.minutesBefore >= 0,
      ),
      visibility: values.visibility,
      status: values.status,
      documentIds: defaults.documentIds,
    });
  };

  const submitInvalidForm = (
    errors: FieldErrors<CalendarEventEditorValues>,
  ) => {
    const message =
      errors.endAt?.message ||
      errors.title?.message ||
      errors.calendarId?.message;
    toast.error(
      intl.formatMessage({
        id: typeof message === "string" ? message : "calendar.requiredFields",
      }),
    );
  };

  const enableEventColor = (checked: boolean) => {
    form.setValue("useEventColor", checked, { shouldDirty: true });
    if (!checked || form.getValues("color") !== null) return;
    form.setValue("color", CALENDAR_DEFAULT_EVENT_COLOR, { shouldDirty: true });
    setShowCustomEventColor(false);
  };

  return {
    ...time,
    ...recurrence,
    attendees,
    documentIds: defaults.documentIds,
    enableEventColor,
    form,
    setAttendees: (next: CalendarEventAttendeePayload[]) => setAttendees(next),
    setShowCustomEventColor,
    showCustomEventColor,
    submit: form.handleSubmit(submitValidForm, submitInvalidForm),
  };
}

export type CalendarEventFormController = ReturnType<
  typeof useCalendarEventForm
>;
