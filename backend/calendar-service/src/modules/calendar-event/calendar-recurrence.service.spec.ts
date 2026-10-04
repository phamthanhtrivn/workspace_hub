import { BadRequestException } from '@nestjs/common';
import { EventSourceType, EventStatus, EventVisibility } from '@prisma/client';
import { CalendarRecurrenceService } from './calendar-recurrence.service';

describe('CalendarRecurrenceService', () => {
  const service = new CalendarRecurrenceService({} as never);

  it('rejects malformed RRULE input', () => {
    expect(() => service.assertValidRule('RRULE:FREQ=UNKNOWN')).toThrow(
      BadRequestException,
    );
  });

  it('rejects high-frequency rules that could grow the database unboundedly', () => {
    expect(() => service.assertValidRule('RRULE:FREQ=HOURLY')).toThrow(
      BadRequestException,
    );
  });

  it.each([
    'RRULE:FREQ=DAILY;BYHOUR=0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23',
    'RRULE:FREQ=DAILY;BYMINUTE=0,1,2,3,4,5,6,7,8,9',
    'RRULE:FREQ=DAILY;BYSECOND=0,1,2,3,4,5,6,7,8,9',
    'RRULE:FREQ=YEARLY;BYWEEKNO=1,2,3',
  ])('rejects unsupported RRULE expansion parts: %s', (rule) => {
    expect(() => service.assertValidRule(rule)).toThrow(BadRequestException);
  });

  it.each([
    'RRULE:FREQ=DAILY;INTERVAL=0',
    'RRULE:FREQ=DAILY;COUNT=0',
    'RRULE:FREQ=WEEKLY;BYDAY=INVALID',
  ])('rejects invalid bounds in otherwise supported rules: %s', (rule) => {
    expect(() => service.assertValidRule(rule)).toThrow(BadRequestException);
  });

  it('truncates a series immediately before the selected occurrence', () => {
    const result = service.truncateBefore(
      'RRULE:FREQ=WEEKLY;COUNT=10',
      new Date('2026-09-15T09:00:00.000Z'),
    );

    expect(result).toBe('RRULE:FREQ=WEEKLY;UNTIL=20260915T085959Z');
  });

  it('reduces COUNT when splitting this and following occurrences', () => {
    const result = service.remainingRule(
      'RRULE:FREQ=DAILY;COUNT=10',
      new Date('2026-09-01T09:00:00.000Z'),
      new Date('2026-09-04T09:00:00.000Z'),
    );

    expect(result).toContain('COUNT=7');
  });

  it('materializes the first occurrence and preserves local time across DST', async () => {
    const createdStarts: Date[] = [];
    const createdSourceTypes: EventSourceType[] = [];
    const createdVisibilities: EventVisibility[] = [];
    const tx = {
      $queryRaw: jest.fn(),
      recurrenceSeries: {
        findUnique: jest.fn(() => Promise.resolve(series)),
        update: jest.fn(),
      },
      calendarEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(
          ({
            data,
          }: {
            data: {
              startAt: Date;
              sourceType: EventSourceType;
              visibility: EventVisibility;
            };
          }) => {
            createdStarts.push(data.startAt);
            createdSourceTypes.push(data.sourceType);
            createdVisibilities.push(data.visibility);
            return Promise.resolve({ id: `event-${createdStarts.length}` });
          },
        ),
      },
      calendarEventDocument: { createMany: jest.fn() },
      calendarEventAttendee: { createMany: jest.fn() },
      reminder: { createMany: jest.fn() },
    };
    const series = {
      id: '11111111-1111-1111-1111-111111111111',
      calendarId: '22222222-2222-2222-2222-222222222222',
      createdBy: '33333333-3333-3333-3333-333333333333',
      updatedBy: null,
      title: 'Daily stand-up',
      description: null,
      location: null,
      startAt: new Date('2026-03-07T14:00:00.000Z'),
      endAt: new Date('2026-03-07T15:00:00.000Z'),
      allDay: false,
      color: '#2563eb',
      status: EventStatus.CONFIRMED,
      visibility: EventVisibility.PRIVATE,
      sourceType: EventSourceType.TASK,
      recurrenceRule: 'FREQ=DAILY;COUNT=2',
      timeZone: 'America/New_York',
      recurrenceGeneratedUntil: null,
      cancelledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      attendees: [],
      reminders: [],
      documents: [],
      exceptions: [],
    };
    const prisma = {
      recurrenceSeries: {
        findUnique: jest.fn().mockResolvedValue(series),
        update: jest.fn(),
      },
      calendarEvent: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const recurrenceService = new CalendarRecurrenceService(prisma as never);

    await recurrenceService.materializeSeriesThrough(
      series.id,
      new Date('2026-03-09T00:00:00.000Z'),
    );

    expect(createdStarts).toEqual([
      new Date('2026-03-07T14:00:00.000Z'),
      new Date('2026-03-08T13:00:00.000Z'),
    ]);
    expect(createdSourceTypes).toEqual([
      EventSourceType.TASK,
      EventSourceType.TASK,
    ]);
    expect(createdVisibilities).toEqual([
      EventVisibility.PRIVATE,
      EventVisibility.PRIVATE,
    ]);
    const transaction = {
      ...tx,
      recurrenceSeries: prisma.recurrenceSeries,
      calendarEvent: {
        ...tx.calendarEvent,
        findUnique: prisma.calendarEvent.findUnique,
      },
    };
    await recurrenceService.materializeSeriesThrough(
      series.id,
      new Date('2026-03-09T00:00:00.000Z'),
      transaction as never,
    );
    // Generation during a series edit must stay in the caller's transaction.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(createdStarts.slice(2)).toEqual(createdStarts.slice(0, 2));

    // A capped batch must save an instant, not the floating Bangkok wall time.
    series.timeZone = 'Asia/Bangkok';
    series.recurrenceRule = 'FREQ=DAILY;COUNT=401';
    createdStarts.length = 0;
    transaction.recurrenceSeries.update.mockImplementation(({ data }) => {
      series.recurrenceGeneratedUntil = data.recurrenceGeneratedUntil;
      return Promise.resolve(series);
    });
    for (let batch = 0; batch < 3; batch += 1) {
      await recurrenceService.materializeSeriesThrough(
        series.id,
        new Date('2028-01-01T00:00:00Z'),
        transaction as never,
      );
    }
    expect(createdStarts).toHaveLength(401);
    for (let index = 1; index < createdStarts.length; index += 1) {
      expect(
        createdStarts[index].getTime() - createdStarts[index - 1].getTime(),
      ).toBe(86_400_000);
    }
  });
});
