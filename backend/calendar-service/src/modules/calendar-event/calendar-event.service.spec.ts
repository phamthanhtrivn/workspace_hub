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
import { EventAccessPolicy } from './event-access.policy';
import { EventMapper } from './event.mapper';
import { EventRelationService } from './event-relation.service';
import { RecurrenceMutationService } from './recurrence-mutation.service';

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
    recurrenceSeriesId: null,
    originalStartAt: null,
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
    recurrenceSeries: null,
  };

  function createService() {
    const tx = {
      calendarEvent: {
        create: jest.fn().mockResolvedValue({ id: eventId }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      calendarEventAttendee: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      reminder: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
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
      recurrenceSeries: {
        create: jest.fn(),
        update: jest.fn(),
      },
      recurrenceSeriesAttendee: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      recurrenceSeriesReminder: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      recurrenceSeriesDocument: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const prisma = {
      calendar: {
        findUnique: jest.fn().mockResolvedValue(calendar),
      },
      calendarEvent: {
        findUnique: jest.fn().mockResolvedValue(event),
        findFirst: jest.fn(),
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

    const accessPolicy = new EventAccessPolicy(prisma as any);
    const mapper = new EventMapper();
    const relations = new EventRelationService();
    const recurrenceMutations = new RecurrenceMutationService(
      prisma as any,
      recurrence as any,
      relations,
    );

    return {
      service: new CalendarEventService(
        prisma as any,
        userProfiles as any,
        recurrence as any,
        resourceAccess as any,
        accessPolicy,
        mapper,
        relations,
        recurrenceMutations,
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

  function recurringFirstOccurrence() {
    const recurrenceSeries = {
      id: '88888888-8888-8888-8888-888888888888',
      calendarId,
      createdBy: ownerId,
      updatedBy: null,
      title: event.title,
      description: null,
      location: null,
      startAt: event.startAt,
      endAt: event.endAt,
      allDay: false,
      color: event.color,
      status: EventStatus.CONFIRMED,
      visibility: EventVisibility.DEFAULT,
      recurrenceRule: 'FREQ=DAILY;COUNT=10',
      timeZone: calendar.timeZone,
      recurrenceGeneratedUntil: new Date('2027-01-01T00:00:00.000Z'),
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      attendees: event.attendees.map((attendee) => ({
        seriesId: '88888888-8888-8888-8888-888888888888',
        userId: attendee.userId,
        optional: attendee.optional,
        createdAt: new Date(),
      })),
      reminders: [],
      documents: [],
      exceptions: [],
    };

    return {
      ...event,
      recurrenceSeriesId: recurrenceSeries.id,
      originalStartAt: event.startAt,
      recurrenceSeries,
    };
  }

  it('editing THIS on the first occurrence does not mutate the series template', async () => {
    const { service, prisma, tx } = createService();
    const firstOccurrence = recurringFirstOccurrence();
    prisma.calendarEvent.findUnique.mockResolvedValue(firstOccurrence);

    await service.updateEvent(ownerId, undefined, eventId, {
      recurrenceScope: RecurrenceScope.THIS,
      title: 'Only this occurrence',
    });

    expect(tx.recurrenceSeries.update).not.toHaveBeenCalled();
    expect(tx.calendarEvent.update).toHaveBeenCalledWith({
      where: { id: eventId },
      data: expect.objectContaining({
        title: 'Only this occurrence',
        isRecurrenceOverride: true,
      }),
    });
  });

  it('cancelling THIS on the first occurrence leaves its series active', async () => {
    const { service, prisma, tx } = createService();
    const firstOccurrence = recurringFirstOccurrence();
    prisma.calendarEvent.findUnique.mockResolvedValue(firstOccurrence);

    await service.cancelEvent(ownerId, eventId, RecurrenceScope.THIS);

    expect(tx.recurrenceSeries.update).not.toHaveBeenCalled();
    expect(tx.calendarEvent.updateMany).toHaveBeenCalledWith({
      where: { id: { in: [eventId] } },
      data: expect.objectContaining({
        status: EventStatus.CANCELLED,
        isRecurrenceOverride: true,
      }),
    });
  });
});
