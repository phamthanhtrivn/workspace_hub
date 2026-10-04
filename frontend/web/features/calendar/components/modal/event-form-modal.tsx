"use client";

import { useState } from "react";
import { useCalendarEventForm } from "../../hooks/use-calendar-event-form";
import {
  CalendarEvent,
  CalendarEventDraft,
  CalendarEventFormValues,
  EventSourceType,
  WorkspaceCalendar,
} from "../../types/calendar.types";
import { isTaskCalendarEvent } from "../../utils/calendar-event.utils";
import { CustomRecurrenceModal } from "./custom-recurrence-modal";
import { QuickCreateKind, QuickCreateModal } from "./quick-create-modal";
import { RecurrenceScopeModal } from "./recurrence-scope-modal";
import { CALENDAR_FORM_COPY as copy } from "../../constants/calendar-form-copy";

interface EventFormModalProps {
  open: boolean;
  calendars: WorkspaceCalendar[];
  initialDraft: CalendarEventDraft | null;
  event?: CalendarEvent | null;
  tasksColor?: string;
  onClose: () => void;
  onSubmit: (values: CalendarEventFormValues) => Promise<void>;
  submitting?: boolean;
}

export function EventFormModal({
  open,
  calendars,
  initialDraft,
  event,
  tasksColor,
  onClose,
  onSubmit,
  submitting,
}: EventFormModalProps) {
  const controller = useCalendarEventForm({
    calendars,
    draft: initialDraft,
    event,
    onSubmit,
  });
  const [quickCreateKind, setQuickCreateKind] = useState<QuickCreateKind>(
    isTaskCalendarEvent(event) ||
      initialDraft?.sourceType === EventSourceType.TASK
      ? "task"
      : "event",
  );

  if (!open) return null;

  const customRecurrenceModal = controller.showCustomRecurrence ? (
    <CustomRecurrenceModal
      key={`${controller.customRecurrence.frequency}-${controller.customRecurrence.interval}`}
      open
      value={controller.customRecurrence}
      startDate={controller.startAt.slice(0, 10)}
      onClose={controller.closeCustomRecurrence}
      onSave={controller.handleCustomRecurrenceSave}
    />
  ) : null;

  return (
    <>
      <QuickCreateModal
        controller={controller}
        calendars={calendars}
        event={event}
        kind={quickCreateKind}
        tasksColor={tasksColor}
        submitting={submitting || controller.isSaving}
        onKindChange={setQuickCreateKind}
        onClose={onClose}
      />
      {customRecurrenceModal}
      {controller.pendingRecurrenceValues && (
        <RecurrenceScopeModal
          open
          title={copy.editRecurringEvent}
          allowSingleOccurrence={
            !controller.getRecurrenceRule(
              controller.pendingRecurrenceValues.startAt,
            ) ||
            controller.getRecurrenceRule(
              controller.pendingRecurrenceValues.startAt,
            ) === event?.recurrenceRule
          }
          onClose={controller.cancelRecurrenceScope}
          onSelect={(scope) => void controller.confirmRecurrenceScope(scope)}
        />
      )}
    </>
  );
}
