import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { FieldErrors, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  createScheduledMeeting,
  updateScheduledMeeting,
  cancelScheduledMeeting,
} from "@/features/meeting/api/meeting.api";
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
  WorkspaceCalendar,
} from "../types/calendar.types";
import { fromDateTimeLocal } from "../utils/calendar-date.utils";
import { createCalendarEventFormDefaults } from "../utils/calendar-event-form.utils";
import {
  buildCalendarMeetingUrl,
  isWorkspaceMeetingUrl,
  parseCalendarMeetingJoinToken,
} from "../utils/calendar-conference.utils";
import { useCalendarEventTime } from "./use-calendar-event-time";
import { useCalendarRecurrence } from "./use-calendar-recurrence";

interface UseCalendarEventFormInput {
  calendars: WorkspaceCalendar[];
  draft: CalendarEventDraft | null;
  event?: CalendarEvent | null;
  onSubmit: (values: CalendarEventFormValues) => Promise<void>;
}

function getValidScheduledMeetingRange(startAtIso: string, endAtIso: string) {
  const now = Date.now();
  let startMs = new Date(startAtIso).getTime();
  let endMs = new Date(endAtIso).getTime();

  if (Number.isNaN(startMs)) startMs = now;
  if (Number.isNaN(endMs)) endMs = startMs + 30 * 60 * 1000;

  // Meeting backend requires startAt > now (in the future)
  if (startMs <= now) {
    startMs = now + 60 * 1000; // 1 minute in the future
  }

  // Ensure endAt > startAt
  if (endMs <= startMs) {
    endMs = startMs + 30 * 60 * 1000; // 30 minutes duration minimum
  }

  return {
    scheduledStartAt: new Date(startMs).toISOString(),
    scheduledEndAt: new Date(endMs).toISOString(),
  };
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
  const [documentIds, setDocumentIds] = useState<string[]>(defaults.documentIds);
  const [showCustomEventColor, setShowCustomEventColor] = useState(
    defaults.showCustomEventColor,
  );
  const [hasConference, setHasConference] = useState<boolean>(() =>
    isWorkspaceMeetingUrl(defaults.values.location),
  );

  const time = useCalendarEventTime(form);
  const recurrence = useCalendarRecurrence(
    time.startAt,
    defaults.defaultStart,
    event,
  );

  const watchStartAt = form.watch("startAt");
  const isPastEvent =
    new Date(fromDateTimeLocal(watchStartAt || defaults.values.startAt)).getTime() <=
    Date.now();

  const handleToggleConference = (enabled: boolean) => {
    if (enabled && isPastEvent) {
      toast.error("Cannot add video conference to past events");
      return;
    }
    setHasConference(enabled);
    if (!enabled && isWorkspaceMeetingUrl(form.getValues("location"))) {
      form.setValue("location", "", { shouldDirty: true });
    }
  };

  const submitValidForm = async (values: CalendarEventEditorValues) => {
    let finalLocation = values.location.trim() || null;
    const attendeeUserIds = attendees.map((a) => a.userId);
    const existingMeetingToken = parseCalendarMeetingJoinToken(finalLocation);
    const eventStartMs = new Date(fromDateTimeLocal(values.startAt)).getTime();
    const isPast = eventStartMs <= Date.now();

    if (isPast) {
      if (existingMeetingToken) {
        try {
          await cancelScheduledMeeting(existingMeetingToken);
        } catch {
          // ignore
        }
        finalLocation = null;
        setHasConference(false);
        toast.info(
          "Video conference is no longer available for past events and has been canceled.",
        );
      } else if (hasConference) {
        setHasConference(false);
        toast.error("Cannot add video conference to past events");
      }
    } else {
      const meetingRange = getValidScheduledMeetingRange(
        fromDateTimeLocal(values.startAt),
        fromDateTimeLocal(values.endAt),
      );

      if (hasConference && !existingMeetingToken) {
        try {
          const meetingRes = await createScheduledMeeting({
            title: values.title.trim() || "Event Meeting",
            scheduledStartAt: meetingRange.scheduledStartAt,
            scheduledEndAt: meetingRange.scheduledEndAt,
            description: values.description.trim() || null,
            inviteeIds: attendeeUserIds,
          });
          if (meetingRes.data?.joinToken) {
            finalLocation = buildCalendarMeetingUrl(meetingRes.data.joinToken);
          }
        } catch {
          toast.error("Failed to create video conference meeting");
        }
      } else if (existingMeetingToken) {
        if (hasConference) {
          try {
            await updateScheduledMeeting(existingMeetingToken, {
              title: values.title.trim() || "Event Meeting",
              scheduledStartAt: meetingRange.scheduledStartAt,
              scheduledEndAt: meetingRange.scheduledEndAt,
              description: values.description.trim() || null,
              inviteeIds: attendeeUserIds,
            });
          } catch {
            // Non-fatal
          }
        } else {
          try {
            await cancelScheduledMeeting(existingMeetingToken);
          } catch {
            // Non-fatal
          }
          finalLocation = null;
        }
      }
    }

    await onSubmit({
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
      attendees: attendees.map(({ userId, optional }) => ({ userId, optional })),
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

  const submitInvalidForm = (
    errors: FieldErrors<CalendarEventEditorValues>,
  ) => {
    const message =
      errors.endAt?.message ||
      errors.title?.message ||
      errors.calendarId?.message;
    toast.error(typeof message === "string" ? message : copy.requiredFields);
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
    isPastEvent,
    setAttendees: (next: CalendarEventAttendeePayload[]) => setAttendees(next),
    setDocumentIds: (next: string[]) => setDocumentIds(next),
    setHasConference: handleToggleConference,
    setShowCustomEventColor,
    showCustomEventColor,
    submit: form.handleSubmit(submitValidForm, submitInvalidForm),
  };
}

export type CalendarEventFormController = ReturnType<
  typeof useCalendarEventForm
>;
