import { AttendeeResponseStatus, Prisma } from '@prisma/client';
import { CalendarNotificationOutboxService } from './calendar-notification-outbox.service';

type SqlCall = [TemplateStringsArray, ...unknown[]];

function createExecuteRawMock() {
  const calls: SqlCall[] = [];
  const mock = jest.fn<(...args: SqlCall) => Promise<number>>((...args) => {
    calls.push(args);
    return Promise.resolve(1);
  });

  return { mock, calls };
}

describe('CalendarNotificationOutboxService', () => {
  const eventId = '11111111-1111-1111-1111-111111111111';
  const creatorId = '22222222-2222-2222-2222-222222222222';
  const recipientId = '33333333-3333-3333-3333-333333333333';

  function setup() {
    const executeRaw = createExecuteRawMock();
    const prisma = {
      $queryRaw: jest.fn(),
      $executeRaw: executeRaw.mock,
    };
    const profiles = {
      getProfilesByUserIds: jest.fn().mockResolvedValue(
        new Map([
          [
            creatorId,
            {
              fullName: 'Calendar Owner',
              email: 'owner@example.com',
              avatarUrl: 'https://example.com/owner.png',
            },
          ],
        ]),
      ),
    };
    const notifications = {
      notifyEventInvitation: jest.fn().mockResolvedValue(undefined),
      notifyAttendeeResponse: jest.fn().mockResolvedValue(undefined),
    };
    return {
      service: new CalendarNotificationOutboxService(
        prisma as never,
        profiles as never,
        notifications as never,
      ),
      prisma,
      executeRaw,
      profiles,
      notifications,
    };
  }

  it('enqueues one invitation per unique guest', async () => {
    const { service } = setup();
    const executeRaw = createExecuteRawMock();
    const database = { $executeRaw: executeRaw.mock };

    await service.enqueueEventInvitations(database as never, {
      eventTitle: 'Planning',
      eventId,
      creatorId,
      recipientIds: [creatorId, recipientId, recipientId],
    });

    expect(executeRaw.mock).toHaveBeenCalledTimes(1);
    expect(executeRaw.calls[0][0].join('')).toContain(
      'INSERT INTO notification_outbox',
    );
    expect(executeRaw.calls[0]).toContain('CALENDAR_EVENT_INVITATION');
  });

  it('delivers a claimed invitation and marks it sent', async () => {
    const { service, prisma, executeRaw, notifications } = setup();
    prisma.$queryRaw.mockResolvedValue([
      {
        id: '44444444-4444-4444-4444-444444444444',
        eventType: 'CALENDAR_EVENT_INVITATION',
        payload: {
          eventTitle: 'Planning',
          eventId,
          recipientId,
          creatorId,
        } satisfies Prisma.JsonObject,
        attemptCount: 0,
      },
    ]);

    await service.drain();

    expect(notifications.notifyEventInvitation).toHaveBeenCalledWith({
      eventTitle: 'Planning',
      eventId,
      recipientId,
      creatorId,
      creatorName: 'Calendar Owner',
      creatorAvatar: 'https://example.com/owner.png',
    });
    expect(executeRaw.calls[0][0].join('')).toContain("status = 'SENT'");
  });

  it('records a retry when Kafka delivery fails', async () => {
    const { service, prisma, executeRaw, notifications } = setup();
    notifications.notifyAttendeeResponse.mockRejectedValue(
      new Error('Kafka unavailable'),
    );
    prisma.$queryRaw.mockResolvedValue([
      {
        id: '55555555-5555-5555-5555-555555555555',
        eventType: 'CALENDAR_ATTENDEE_RESPONSE',
        payload: {
          eventTitle: 'Planning',
          eventId,
          recipientId: creatorId,
          responderId: recipientId,
          status: AttendeeResponseStatus.ACCEPTED,
        } satisfies Prisma.JsonObject,
        attemptCount: 0,
      },
    ]);

    await service.drain();

    const failed = executeRaw.calls[0];
    expect(failed[0].join('')).toContain("status = 'FAILED'");
    expect(failed).toContain(1);
    expect(failed).toContain('Kafka unavailable');
    expect(failed.some((value) => value instanceof Date)).toBe(true);
  });
});
