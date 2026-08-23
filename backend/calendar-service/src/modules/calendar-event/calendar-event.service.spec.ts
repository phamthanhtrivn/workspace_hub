import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AttendeeResponseStatus,
  EventStatus,
  ReminderMethod,
} from '@prisma/client';
import { CalendarEventService } from './calendar-event.service';

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
    visibility: 'DEFAULT',
    recurrenceRule: null,
    exceptionDates: [],
    documentIds: [],
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
  };

  function createService() {
    const tx = {
      calendarEvent: {
        create: jest.fn().mockResolvedValue({ id: eventId }),
        update: jest.fn(),
      },
      calendarEventAttendee: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      reminder: {
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
        findMany: jest.fn(),
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

    return {
      service: new CalendarEventService(prisma as any, userProfiles as any),
      prisma,
      tx,
      userProfiles,
    };
  }

  it('creates event attendees and reminders in one transaction', async () => {
    const { service, prisma, tx } = createService();

    await service.createEvent(ownerId, {
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
        },
      ],
    });
  });

  it('rejects an event whose endAt is not after startAt', async () => {
    const { service } = createService();

    await expect(
      service.createEvent(ownerId, {
        calendarId,
        title: 'Bad range',
        startAt: '2026-08-24T10:00:00.000Z',
        endAt: '2026-08-24T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks users who are neither calendar owner nor attendee', async () => {
    const { service } = createService();

    await expect(service.getEventById(outsiderId, eventId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
