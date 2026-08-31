/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AttendeeResponseStatus,
  EventStatus,
  EventSourceType,
  EventVisibility,
  ReminderMethod,
} from '@prisma/client';
import { CalendarEventService } from './calendar-event.service';
import { RecurrenceScope } from '../../common/enums/calendar.enum';

describe('CalendarEventService', () => {
  const ownerId = '11111111-1111-1111-1111-111111111111';
  const guestId = '22222222-2222-2222-2222-222222222222';
  const outsiderId = '33333333-3333-3333-3333-333333333333';
  const calendarId = '44444444-4444-4444-4444-444444444444';
  const eventId = '55555555-5555-5555-5555-555555555555';

  const calendar = {
    id: calendarId,
    ownerUserId: ownerId,
    projectId: null,
    name: 'Work',
    description: null,
    color: '#2563eb',
    icon: null,
    timeZone: 'Asia/Ho_Chi_Minh',
    isDefault: true,
    isVisible: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const event = {
    id: eventId,
    calendarId,
    createdBy: ownerId,
    updatedBy: null,
    title: 'Planning',
    description: null,
    location: null,
    startAt: new Date('2026-08-24T09:00:00.000Z'),
    endAt: new Date('2026-08-24T10:00:00.000Z'),
    allDay: false,
    color: '#2563eb',
    status: EventStatus.CONFIRMED,
    visibility: EventVisibility.DEFAULT,
    recurrenceRule: null,
    recurrenceParentId: null,
    originalStartAt: null,
    recurrenceGeneratedUntil: null,
    isRecurrenceOverride: false,
    sourceType: EventSourceType.USER,
    sourceId: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    calendar,
    attendees: [
      {
        id: '66666666-6666-6666-6666-666666666666',
        eventId,
        userId: ownerId,
        responseStatus: AttendeeResponseStatus.ACCEPTED,
        optional: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '77777777-7777-7777-7777-777777777777',
        eventId,
        userId: guestId,
        responseStatus: AttendeeResponseStatus.NEEDS_ACTION,
        optional: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    reminders: [],
    documents: [],
    recurrenceExceptions: [],
  };

  function createService() {
    const tx = {
      calendarEvent: {
        create: jest.fn().mockResolvedValue({ id: eventId }),
        update: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      calendarEventAttendee: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      reminder: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      calendarEventDocument: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      recurrenceException: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn(),
      },
    };

    const prisma = {
      calendar: {
        findUnique: jest.fn().mockResolvedValue(calendar),
      },
      calendarEvent: {
        findUnique: jest.fn().mockResolvedValue(event),
        findMany: jest.fn().mockResolvedValue([event]),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn(),
      },
      calendarEventAttendee: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    const userProfiles = {
      attachProfilesToEvents: jest.fn(async (events) => events),
    };

    const recurrence = {
      assertValidRule: jest.fn(),
      materializeSeriesThrough: jest.fn(),
      materializeAllSeriesThrough: jest.fn(),
      getDefaultGenerationEnd: jest.fn(
        (startAt: Date) => new Date(startAt.getTime() + 180 * 86_400_000),
      ),
    };
    const resourceAccess = {
      assertDocumentAccess: jest.fn(),
      assertProjectAccess: jest.fn(),
    };

    return {
      service: new CalendarEventService(
        prisma as any,
        userProfiles as any,
        recurrence as any,
        resourceAccess as any,
      ),
      prisma,
      tx,
      userProfiles,
      recurrence,
    };
  }

  it('creates event attendees and reminders in one transaction', async () => {
    const { service, prisma, tx } = createService();

    await service.createEvent(ownerId, undefined, {
      calendarId,
      title: 'Planning',
      startAt: '2026-08-24T09:00:00.000Z',
      endAt: '2026-08-24T10:00:00.000Z',
      attendees: [{ userId: guestId }],
      reminders: [{ minutesBefore: 10, method: ReminderMethod.ALERT }],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.calendarEventAttendee.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            userId: ownerId,
            responseStatus: AttendeeResponseStatus.ACCEPTED,
          }),
          expect.objectContaining({
            userId: guestId,
            responseStatus: AttendeeResponseStatus.NEEDS_ACTION,
          }),
        ]),
      }),
    );
    expect(tx.reminder.createMany).toHaveBeenCalledWith({
      data: [
        {
          eventId,
          minutesBefore: 10,
          method: ReminderMethod.ALERT,
          scheduledAt: new Date('2026-08-24T08:50:00.000Z'),
        },
      ],
    });
  });

  it('rejects an event whose endAt is not after startAt', async () => {
    const { service } = createService();

    await expect(
      service.createEvent(ownerId, undefined, {
        calendarId,
        title: 'Bad range',
        startAt: '2026-08-24T10:00:00.000Z',
        endAt: '2026-08-24T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks users who are neither calendar owner nor attendee', async () => {
    const { service } = createService();

    await expect(
      service.getEventById(outsiderId, eventId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps list queries read-only and leaves recurrence generation to the worker', async () => {
    const { service, recurrence } = createService();

    const result = await service.getEvents(ownerId, {
      startAt: '2026-08-01T00:00:00.000Z',
      endAt: '2026-09-01T00:00:00.000Z',
      page: 1,
      limit: 50,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).not.toHaveProperty('documents');
    expect(result.items[0]).not.toHaveProperty('recurrenceExceptions');
    expect(result.items[0]).toEqual(
      expect.objectContaining({ documentIds: [], exceptionDates: [] }),
    );
    expect(recurrence.materializeSeriesThrough).not.toHaveBeenCalled();
    expect(recurrence.materializeAllSeriesThrough).not.toHaveBeenCalled();
  });

  it('rebuilds generated occurrences after series exceptions change', async () => {
    const { service, prisma, tx, recurrence } = createService();
    const recurringRoot = {
      ...event,
      recurrenceRule: 'RRULE:FREQ=DAILY',
      originalStartAt: event.startAt,
    };
    const occurrence = {
      ...recurringRoot,
      id: '88888888-8888-8888-8888-888888888888',
      recurrenceParentId: eventId,
      startAt: new Date('2026-08-25T09:00:00.000Z'),
      endAt: new Date('2026-08-25T10:00:00.000Z'),
      originalStartAt: new Date('2026-08-25T09:00:00.000Z'),
    };
    prisma.calendarEvent.findUnique.mockResolvedValue(recurringRoot);
    prisma.calendarEvent.findMany.mockResolvedValue([
      recurringRoot,
      occurrence,
    ]);

    await service.updateEvent(ownerId, undefined, eventId, {
      recurrenceScope: RecurrenceScope.ALL,
      exceptionDates: ['2026-08-25T09:00:00.000Z'],
    });

    expect(tx.calendarEvent.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        recurrenceParentId: eventId,
        isRecurrenceOverride: false,
      }),
    });
    expect(tx.calendarEvent.update).toHaveBeenCalledWith({
      where: { id: eventId },
      data: {
        recurrenceGeneratedUntil: new Date('2026-08-25T08:59:59.999Z'),
      },
    });
    expect(recurrence.materializeSeriesThrough).toHaveBeenCalledWith(
      eventId,
      expect.any(Date),
    );
  });
});
