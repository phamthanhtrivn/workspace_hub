"use client";

import { CalendarConfirmDialog } from "../ui/calendar-confirm-dialog";

export function DeleteCalendarModal({
  open,
  calendarName,
  pending = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  calendarName: string;
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <CalendarConfirmDialog
      open={open}
      title="Delete calendar"
      description={`Are you sure you want to delete the calendar "${calendarName}"? All events in this calendar will also be deleted.`}
      confirmLabel="Delete calendar"
      cancelLabel="Cancel"
      variant="danger"
      isLoading={pending}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
