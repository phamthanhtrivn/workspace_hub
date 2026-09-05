"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppIntl } from "@/features/i18n/useAppIntl";
import { useCalendarEventForm } from "../../hooks/use-calendar-event-form";
import {
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFormValues,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import { CustomRecurrenceModal } from "./custom-recurrence-modal";
import { EventAdvancedForm } from "./event-advanced-form";
import { QuickCreateKind, QuickCreateModal } from "./quick-create-modal";

interface EventFormModalProps {
  open: boolean;
  calendars: WorkspaceCalendar[];
  initialDraft: CalendarEventDraft | null;
  event?: CalendarEvent | null;
  onClose: () => void;
  onSubmit: (values: CalendarEventFormValues) => Promise<void>;
  submitting?: boolean;
}

export function EventFormModal({
  open,
  calendars,
  initialDraft,
  event,
  onClose,
  onSubmit,
  submitting,
}: EventFormModalProps) {
  const intl = useAppIntl();
  const controller = useCalendarEventForm({
    calendars,
    draft: initialDraft,
    event,
    onSubmit,
  });
  const [showMoreOptions, setShowMoreOptions] = useState(Boolean(event));
  const [quickCreateKind, setQuickCreateKind] =
    useState<QuickCreateKind>("event");

  if (!open) return null;

  const customRecurrenceModal = controller.showCustomRecurrence ? (
    <CustomRecurrenceModal
      key={`${controller.customRecurrence.frequency}-${controller.customRecurrence.interval}`}
      open
      value={controller.customRecurrence}
      onClose={controller.closeCustomRecurrence}
      onSave={controller.handleCustomRecurrenceSave}
    />
  ) : null;

  if (!event && !showMoreOptions) {
    return (
      <>
        <QuickCreateModal
          form={controller.form}
          calendars={calendars}
          kind={quickCreateKind}
          timeEditor={{
            recurrencePreset: controller.recurrencePreset,
            recurrenceOptions: controller.recurrenceOptions,
            onStartDateChange: controller.handleStartDateChange,
            onStartTimeChange: controller.handleStartTimeChange,
            onEndDateTimeChange: controller.handleEndDateTimeChange,
            onAllDayChange: controller.handleAllDayChange,
            onRecurrenceChange: controller.handleRecurrenceChange,
          }}
          attendees={controller.attendees}
          submitting={submitting}
          onKindChange={setQuickCreateKind}
          onAttendeesChange={controller.setAttendees}
          onClose={onClose}
          onMoreOptions={() => setShowMoreOptions(true)}
          onSubmitEvent={controller.submit}
          onSubmitUiOnly={(kind) =>
            toast.info(
              intl.formatMessage({
                id:
                  kind === "task"
                    ? "calendar.quick.taskUiOnly"
                    : "calendar.quick.appointmentUiOnly",
              }),
            )
          }
          onUnavailableFeature={() =>
            toast.info(
              intl.formatMessage({ id: "calendar.quick.conferenceUiOnly" }),
            )
          }
        />
        {customRecurrenceModal}
      </>
    );
  }

  return (
    <>
      <EventAdvancedForm
        calendars={calendars}
        controller={controller}
        event={event}
        onClose={onClose}
        submitting={submitting}
      />
      {customRecurrenceModal}
    </>
  );
}
