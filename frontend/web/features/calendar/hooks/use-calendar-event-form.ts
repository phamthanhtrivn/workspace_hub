import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { meetingKeys } from "@/features/meeting/types/meeting.query-keys";
import { CALENDAR_FORM_COPY as copy } from "../constants/calendar-form-copy";
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
  RecurrenceScope,
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
  const queryClient = useQueryClient();
  const defaultCalendar =
    calendars.find((calendar) => !calendar.projectId && calendar.isDefault) ??
    calendars.find((calendar) => !calendar.projectId);
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
  const [documentIds, setDocumentIds] = useState<string[]>(
    defaults.documentIds,
  );
  const [showCustomEventColor, setShowCustomEventColor] = useState(
    defaults.showCustomEventColor,
  );
  const [hasConference, setHasConference] = useState<boolean>(() =>
    Boolean(event?.conference?.enabled),
  );
  const [pendingRecurrenceValues, setPendingRecurrenceValues] =
    useState<CalendarEventEditorValues | null>(null);
  const savingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const time = useCalendarEventTime(form);
  const recurrence = useCalendarRecurrence(
    time.startAt,
    defaults.defaultStart,
    event,
  );

  const watchStartAt = form.watch("startAt");
  const isPastEvent =
    new Date(
      fromDateTimeLocal(watchStartAt || defaults.values.startAt),
    ).getTime() <= Date.now();

  const handleToggleConference = (enabled: boolean) => {
    if (enabled && isPastEvent) {
      toast.error("Cannot add video conference to past events");
      return;
    }
    setHasConference(enabled);

  };



  const persistValidForm = async (values: CalendarEventEditorValues) => {
    const finalLocation = values.location.trim() || null;
    await onSubmit({
      conference: { enabled: hasConference },
      calendarId: values.calendarId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      location: finalLocation,
      startAt: fromDateTimeLocal(values.startAt),
      endAt: fromDateTimeLocal(values.endAt),
      allDay: values.allDay,
      color: values.useEventColor ? values.color : null,
      recurrenceRule: recurrence.getRecurrenceRule(values.startAt),
      recurrenceScope: event ? values.recurrenceScope : undefined,
      attendees: attendees.map(({ userId, optional }) => ({
        userId,
        optional,
      })),
      reminders: values.reminders.filter(
        (reminder) =>
          Number.isFinite(reminder.minutesBefore) &&
          reminder.minutesBefore >= 0,
      ),
      visibility: values.visibility,
      status: values.status,
      documentIds,
      sourceType: values.sourceType,
    });

    void queryClient.invalidateQueries({
      queryKey: meetingKeys.upcomingRoot,
    });
  };

  const submitValidForm = async (values: CalendarEventEditorValues) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);
    try {
      await persistValidForm(values);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  const submitInvalidForm = (
    errors: FieldErrors<CalendarEventEditorValues>,
  ) => {
    const message =
      errors.endAt?.message ||
      errors.title?.message ||
      errors.calendarId?.message;
    toast.error(typeof message === "string" ? message : copy.requiredFields);
  };

  const submitWithRecurrenceScope = async (values: CalendarEventEditorValues) => {
    if (savingRef.current) return;
    if (event?.recurrenceParentId || event?.recurrenceRule) {
      setPendingRecurrenceValues(values);
      return;
    }
    await submitValidForm(values);
  };

  const confirmRecurrenceScope = async (scope: RecurrenceScope) => {
    if (!pendingRecurrenceValues) return;
    const values = pendingRecurrenceValues;
    setPendingRecurrenceValues(null);
    await submitValidForm({ ...values, recurrenceScope: scope });
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
    documentIds,
    enableEventColor,
    form,
    hasConference,
    isSaving,
    pendingRecurrenceValues,
    confirmRecurrenceScope,
    cancelRecurrenceScope: () => setPendingRecurrenceValues(null),
    isPastEvent,
    setAttendees: (next: CalendarEventAttendeePayload[]) => setAttendees(next),
    setDocumentIds: (next: string[]) => setDocumentIds(next),
    setHasConference: handleToggleConference,
    setShowCustomEventColor,
    showCustomEventColor,
    submit: form.handleSubmit(submitWithRecurrenceScope, submitInvalidForm),
  };
}

export type CalendarEventFormController = ReturnType<
  typeof useCalendarEventForm
>;
