"use client";

import { useAppIntl } from "@/features/i18n/useAppIntl";
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
  const intl = useAppIntl();

  return (
    <CalendarConfirmDialog
      open={open}
      title={intl.formatMessage({ id: "calendar.deleteCalendar" })}
      description={intl.formatMessage(
        { id: "calendar.deleteCalendarConfirm" },
        { name: calendarName },
      )}
      confirmLabel={intl.formatMessage({ id: "calendar.deleteCalendar" })}
      cancelLabel={intl.formatMessage({ id: "app.cancel" })}
      variant="danger"
      isLoading={pending}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
