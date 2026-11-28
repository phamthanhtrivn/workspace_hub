import { ReminderDeliveryStatus } from '@prisma/client';

/** Only called for a newly configured or explicitly rescheduled reminder. */
export function reminderSchedule(
  startAt: Date,
  minutesBefore: number,
  now = Date.now(),
) {
  const scheduledAt = new Date(startAt.getTime() - minutesBefore * 60_000);

  return {
    scheduledAt,
    deliveryStatus:
      scheduledAt.getTime() < now
        ? ReminderDeliveryStatus.CANCELLED
        : ReminderDeliveryStatus.PENDING,
  };
}
