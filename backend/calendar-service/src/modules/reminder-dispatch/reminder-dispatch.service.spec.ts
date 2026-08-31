/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ReminderDeliveryStatus, ReminderMethod } from '@prisma/client';
import { of, throwError } from 'rxjs';
import { ReminderDispatchService } from './reminder-dispatch.service';

describe('ReminderDispatchService', () => {
  const reminder = {
    id: '11111111-1111-1111-1111-111111111111',
    eventId: '22222222-2222-2222-2222-222222222222',
    minutesBefore: 10,
    method: ReminderMethod.ALERT,
    scheduledAt: new Date('2026-08-28T01:00:00.000Z'),
    deliveryStatus: ReminderDeliveryStatus.PENDING,
    attemptCount: 0,
    nextAttemptAt: null,
    dispatchedAt: null,
    lastError: null,
    createdAt: new Date(),
    event: {
      id: '22222222-2222-2222-2222-222222222222',
      title: 'Planning',
      startAt: new Date('2026-08-28T02:00:00.000Z'),
      location: null,
      attendees: [{ userId: '33333333-3333-3333-3333-333333333333' }],
    },
  };

  function setup(
    emitResult = of(undefined),
    reminderOverride: Partial<typeof reminder> = {},
  ) {
    const selectedReminder = { ...reminder, ...reminderOverride };
    const prisma = {
      reminder: {
        findMany: jest.fn().mockResolvedValue([selectedReminder]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue(undefined),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      userProfileSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          {
            userId: reminder.event.attendees[0].userId,
            email: 'guest@example.com',
            fullName: 'Guest',
          },
        ]),
      },
    };
    const kafka = { connect: jest.fn(), emit: jest.fn(() => emitResult) };
    return {
      service: new ReminderDispatchService(prisma as never, kafka as never),
      prisma,
      kafka,
    };
  }

  it('claims, emits and marks a due reminder as dispatched', async () => {
    const { service, prisma, kafka } = setup();

    await service.dispatchDueReminders();

    expect(kafka.emit).toHaveBeenCalledWith(
      'calendar-reminder-events',
      expect.objectContaining({
        deliveryId: reminder.id,
        method: ReminderMethod.ALERT,
      }),
    );
    expect(prisma.reminder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliveryStatus: ReminderDeliveryStatus.DISPATCHED,
        }),
      }),
    );
  });

  it('schedules a retry when Kafka publishing fails', async () => {
    const { service, prisma } = setup(
      throwError(() => new Error('Kafka unavailable')),
    );

    await service.dispatchDueReminders();

    expect(prisma.reminder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliveryStatus: ReminderDeliveryStatus.FAILED,
          lastError: 'Kafka unavailable',
        }),
      }),
    );
  });

  it('moves a reminder to dead letter after the final failed attempt', async () => {
    const { service, prisma } = setup(
      throwError(() => new Error('Kafka unavailable')),
      { attemptCount: 9 },
    );

    await service.dispatchDueReminders();

    expect(prisma.reminder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          deliveryStatus: ReminderDeliveryStatus.DEAD_LETTER,
          nextAttemptAt: null,
        }),
      }),
    );
  });

  it('cleans terminal reminders after the retention period', async () => {
    const { service, prisma } = setup();

    await service.cleanupCompletedReminders();

    expect(prisma.reminder.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deliveryStatus: {
            in: expect.arrayContaining([
              ReminderDeliveryStatus.DISPATCHED,
              ReminderDeliveryStatus.DEAD_LETTER,
            ]),
          },
        }),
      }),
    );
  });
});
