import { EventSourceType } from '@prisma/client';
import { TaskCalendarSyncService } from './task-calendar-sync.service';

describe('TaskCalendarSyncService', () => {
  const payload = {
    eventType: 'PROJECT_TASK_CALENDAR_UPSERTED' as const,
    occurredAt: '2026-08-30T10:00:00.000Z',
    task: {
      id: '11111111-1111-1111-1111-111111111111',
      projectId: '22222222-2222-2222-2222-222222222222',
      projectName: 'Workspace Hub',
      projectColor: '#f97316',
      title: 'Release calendar',
      description: null,
      startAt: '2026-08-31T02:00:00.000Z',
      endAt: '2026-08-31T03:00:00.000Z',
      allDay: false,
      createdBy: '33333333-3333-3333-3333-333333333333',
      recipientUserIds: ['44444444-4444-4444-4444-444444444444'],
    },
  };

  function createService(checkpoint: { occurredAt: Date } | null = null) {
    const tx = {
      $executeRaw: jest.fn(),
      taskCalendarSyncCheckpoint: {
        findUnique: jest.fn().mockResolvedValue(checkpoint),
        upsert: jest.fn(),
      },
      calendarEvent: {
        deleteMany: jest.fn(),
        upsert: jest.fn().mockResolvedValue({ id: 'event-id' }),
      },
      calendar: {
        upsert: jest.fn().mockResolvedValue({
          id: 'calendar-id',
          color: '#f97316',
        }),
      },
      calendarEventAttendee: { upsert: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(
        async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
      ),
    };

    return {
      service: new TaskCalendarSyncService(prisma as never),
      tx,
    };
  }

  it('ignores a stale task snapshot', async () => {
    const { service, tx } = createService({
      occurredAt: new Date('2026-08-30T10:01:00.000Z'),
    });

    await service.synchronize(payload);

    expect(tx.calendarEvent.deleteMany).not.toHaveBeenCalled();
    expect(tx.calendarEvent.upsert).not.toHaveBeenCalled();
    expect(tx.taskCalendarSyncCheckpoint.upsert).not.toHaveBeenCalled();
  });

  it('creates a project task event and advances its checkpoint atomically', async () => {
    const { service, tx } = createService();

    await service.synchronize(payload);

    expect(tx.calendarEvent.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          calendarId_sourceType_sourceId: {
            calendarId: 'calendar-id',
            sourceType: EventSourceType.TASK,
            sourceId: payload.task.id,
          },
        },
      }),
    );
    expect(tx.taskCalendarSyncCheckpoint.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { taskId: payload.task.id } }),
    );
  });
});
