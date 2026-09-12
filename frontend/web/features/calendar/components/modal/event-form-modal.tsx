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
import { CustomRecurrenceModal } from "./custom-recurrence-modal";
import { QuickCreateKind, QuickCreateModal } from "./quick-create-modal";

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
    event?.sourceType === EventSourceType.TASK ? "task" : "event",
  );

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

  return (
    <>
      <QuickCreateModal
        controller={controller}
        calendars={calendars}
        event={event}
        kind={quickCreateKind}
        tasksColor={tasksColor}
        submitting={submitting}
        onKindChange={setQuickCreateKind}
        onClose={onClose}
      />
      {customRecurrenceModal}
    </>
  );
}
