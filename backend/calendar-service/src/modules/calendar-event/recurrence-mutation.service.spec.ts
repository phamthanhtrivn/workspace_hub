import { BadRequestException } from '@nestjs/common';
import { EventSourceType, EventStatus, EventVisibility } from '@prisma/client';
import { RecurrenceScope } from '../../common/enums/calendar.enum';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { EventWithRelations } from './calendar-event.types';
import { EventRelationService } from './event-relation.service';
import { RecurrenceMutationService } from './recurrence-mutation.service';

describe('Recurring event edits', () => {
  const startAt = new Date('2026-10-05T02:00:00.000Z');
  const endAt = new Date('2026-10-05T03:00:00.000Z');
  const calendar: EventWithRelations['calendar'] = {
    id: 'calendar',
    timeZone: 'Asia/Bangkok',
    ownerUserId: 'owner',
    projectId: null,
    name: 'Personal',
    description: null,
    color: '#2563eb',
    icon: null,
    isDefault: true,
    isVisible: true,
    createdAt: startAt,
    updatedAt: startAt,
  };
  const series: NonNullable<EventWithRelations['recurrenceSeries']> = {
    id: 'series',
    calendarId: calendar.id,
    createdBy: 'owner',
    title: 'Series title',
    description: 'Series description',
    location: null,
    startAt,
    endAt,
    allDay: false,
    color: '#2563eb',
    status: EventStatus.CONFIRMED,
    visibility: EventVisibility.DEFAULT,
    sourceType: EventSourceType.USER,
    timeZone: calendar.timeZone,
    recurrenceRule: 'FREQ=DAILY;COUNT=10',
    attendees: [],
    reminders: [],
    documents: [],
    exceptions: [],
    updatedBy: null,
    recurrenceGeneratedUntil: null,
    cancelledAt: null,
    createdAt: startAt,
    updatedAt: startAt,
  };
  const event: EventWithRelations = {
    ...series,
    attendees: [],
    reminders: [],
    documents: [],
    id: 'selected',
    calendar,
    recurrenceSeries: series,
    recurrenceSeriesId: series.id,
    originalStartAt: new Date('2026-10-08T02:00:00.000Z'),
    startAt: new Date('2026-10-08T02:00:00.000Z'),
    endAt: new Date('2026-10-08T03:00:00.000Z'),
    isRecurrenceOverride: false,
    sourceId: null,
    taskOrder: null,
    completedAt: null,
  };

  function setup(
    occurrences: EventWithRelations[] = [event],
    current = occurrences.find(({ id }) => id === event.id) ?? event,
  ) {
    const tx = {
      recurrenceSeries: {
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'next-series' }),
      },
      calendarEvent: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue(occurrences),
        findFirst: jest.fn().mockResolvedValue({ id: 'generated' }),
      },
      recurrenceException: { deleteMany: jest.fn(), createMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const recurrence = {
      lockSeries: jest.fn(),
      assertHasOccurrence: jest.fn(),
      materializeSeriesThrough: jest.fn(),
      getDefaultGenerationEnd: jest
        .fn()
        .mockReturnValue(new Date('2027-04-01T00:00:00.000Z')),
      truncateBefore: jest
        .fn()
        .mockReturnValue('FREQ=DAILY;UNTIL=20261008T015959Z'),
      remainingRule: jest.fn().mockReturnValue('FREQ=DAILY;COUNT=7'),
    };
    const relations = {
      replaceEventRelations: jest.fn(),
      replaceSeriesRelations: jest.fn(),
      createSeriesRelations: jest.fn(),
    };
    const service = new RecurrenceMutationService(
      prisma as never,
      recurrence as unknown as CalendarRecurrenceService,
      relations as unknown as EventRelationService,
    );
    return { service, tx, prisma, recurrence, relations };
  }

  it('edits only the selected occurrence without writing to the series', async () => {
    const { service, tx } = setup();
    expect(
      await service.updateRecurringEvent('owner', event, event.calendar, {
        title: 'Only this',
        recurrenceScope: RecurrenceScope.THIS,
      }),
    ).toBe(event.id);
    expect(tx.recurrenceSeries.update).not.toHaveBeenCalled();
    expect(tx.calendarEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: event.id },
        data: expect.objectContaining({
          title: 'Only this',
          isRecurrenceOverride: true,
        }),
      }),
    );
  });

  it('rejects changing the rule for a single occurrence before any writes', async () => {
    const { service, prisma } = setup();
    await expect(
      service.updateRecurringEvent('owner', event, event.calendar, {
        recurrenceRule: 'FREQ=WEEKLY',
        recurrenceScope: RecurrenceScope.THIS,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('retains override markers and the selected identity on metadata-only series edits', async () => {
    const override = {
      ...event,
      id: 'override',
      isRecurrenceOverride: true,
      description: 'Individual note',
    };
    const { service, tx, recurrence } = setup([event, override]);
    expect(
      await service.updateRecurringEvent('owner', event, event.calendar, {
        title: 'New title',
        recurrenceScope: RecurrenceScope.ALL,
      }),
    ).toBe(event.id);
    expect(tx.calendarEvent.deleteMany).not.toHaveBeenCalled();
    expect(recurrence.materializeSeriesThrough).not.toHaveBeenCalled();
    const patch = tx.calendarEvent.update.mock.calls[1][0].data;
    expect(patch.description).toBeUndefined();
    expect(patch).not.toHaveProperty('isRecurrenceOverride');
  });

  it('regenerates regular slots while retaining moved and cancelled overrides', async () => {
    const override = {
      ...event,
      id: 'override',
      isRecurrenceOverride: true,
      status: EventStatus.CANCELLED,
    };
    const { service, tx, recurrence } = setup([override]);
    await service.updateRecurringEvent('owner', event, event.calendar, {
      recurrenceRule: 'FREQ=WEEKLY;COUNT=3',
      recurrenceScope: RecurrenceScope.ALL,
    });
    expect(tx.calendarEvent.deleteMany).toHaveBeenCalledWith({
      where: { recurrenceSeriesId: series.id, isRecurrenceOverride: false },
    });
    const patch = tx.calendarEvent.update.mock.calls[0][0].data;
    expect(patch.startAt).toBeUndefined();
    expect(patch.status).toBeUndefined();
    expect(patch.cancelledAt).toBeUndefined();
    expect(recurrence.materializeSeriesThrough).toHaveBeenCalledWith(
      series.id,
      expect.any(Date),
      tx,
    );
    expect(tx.calendarEvent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          originalStartAt: { gte: event.originalStartAt },
        }),
      }),
    );
  });

  it('moves exception slots with the series but preserves unrelated override times', async () => {
    const override = { ...event, id: 'override', isRecurrenceOverride: true };
    const exceptionDate = new Date('2026-10-10T02:00:00.000Z');
    const selected = {
      ...event,
      recurrenceSeries: {
        ...series,
        exceptions: [
          {
            id: 'exception',
            seriesId: series.id,
            occurrenceStart: exceptionDate,
            createdAt: startAt,
            type: 'EXCLUDED',
          },
        ],
      },
    } as EventWithRelations;
    const { service, tx } = setup([override], selected);
    await service.updateRecurringEvent('owner', selected, selected.calendar, {
      startAt: '2026-10-08T04:00:00.000Z',
      endAt: '2026-10-08T05:00:00.000Z',
      recurrenceScope: RecurrenceScope.ALL,
    });
    expect(
      tx.calendarEvent.update.mock.calls[0][0].data.startAt,
    ).toBeUndefined();
    expect(
      tx.calendarEvent.update.mock.calls[0][0].data.originalStartAt,
    ).toEqual(new Date('2026-10-08T04:00:00.000Z'));
    expect(tx.recurrenceException.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          {
            seriesId: series.id,
            occurrenceStart: new Date('2026-10-10T04:00:00.000Z'),
          },
        ],
      }),
    );
  });

  it('splits following events without copying an individual override to the whole new series', async () => {
    const override = {
      ...event,
      isRecurrenceOverride: true,
      title: 'Individual title',
      startAt: new Date('2026-10-08T05:00:00.000Z'),
    };
    const { service, tx, relations, recurrence } = setup([override]);
    expect(
      await service.updateRecurringEvent('owner', override, override.calendar, {
        description: 'New shared note',
        recurrenceScope: RecurrenceScope.THIS_AND_FOLLOWING,
      }),
    ).toBe(event.id);
    expect(tx.recurrenceSeries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: series.title,
          startAt: event.originalStartAt,
          recurrenceRule: 'FREQ=DAILY;COUNT=7',
        }),
      }),
    );
    expect(tx.calendarEvent.deleteMany).toHaveBeenCalledWith({
      where: {
        recurrenceSeriesId: series.id,
        originalStartAt: { gte: event.originalStartAt },
        isRecurrenceOverride: false,
      },
    });
    expect(tx.calendarEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: event.id },
        data: expect.objectContaining({
          recurrenceSeriesId: 'next-series',
          startAt: undefined,
        }),
      }),
    );
    expect(relations.createSeriesRelations).toHaveBeenCalled();
    expect(recurrence.materializeSeriesThrough).toHaveBeenCalledWith(
      'next-series',
      expect.any(Date),
      tx,
    );
  });

  it('rejects an empty regenerated series inside the transaction', async () => {
    const { service, tx } = setup([]);
    tx.calendarEvent.findFirst.mockResolvedValue(null);
    await expect(
      service.updateRecurringEvent('owner', event, event.calendar, {
        recurrenceRule: 'FREQ=DAILY;UNTIL=20250101T000000Z',
        recurrenceScope: RecurrenceScope.ALL,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('preserves duration when shifting a series with only startAt supplied', async () => {
    const { service, tx } = setup([]);
    await service.updateRecurringEvent('owner', event, calendar, {
      startAt: '2026-10-08T04:00:00.000Z',
      recurrenceScope: RecurrenceScope.ALL,
    });
    expect(tx.recurrenceSeries.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startAt: new Date('2026-10-05T04:00:00.000Z'),
          endAt: new Date('2026-10-05T05:00:00.000Z'),
        }),
      }),
    );
  });

  it('applies duration deltas from an override without spreading its moved time to following slots', async () => {
    const override = {
      ...event,
      isRecurrenceOverride: true,
      startAt: new Date('2026-10-08T05:00:00.000Z'),
      endAt: new Date('2026-10-08T06:00:00.000Z'),
    };
    const { service, tx } = setup([override]);
    await service.updateRecurringEvent('owner', override, calendar, {
      endAt: '2026-10-08T06:30:00.000Z',
      recurrenceScope: RecurrenceScope.THIS_AND_FOLLOWING,
    });
    expect(tx.recurrenceSeries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startAt: event.originalStartAt,
          endAt: new Date('2026-10-08T03:30:00.000Z'),
        }),
      }),
    );
    expect(tx.calendarEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startAt: undefined,
          endAt: new Date('2026-10-08T06:30:00.000Z'),
        }),
      }),
    );
  });

  it('propagates generation failure so the surrounding transaction can roll back', async () => {
    const { service, recurrence } = setup([]);
    recurrence.materializeSeriesThrough.mockRejectedValue(
      new Error('generation failed'),
    );
    await expect(
      service.updateRecurringEvent('owner', event, event.calendar, {
        recurrenceRule: 'FREQ=WEEKLY',
        recurrenceScope: RecurrenceScope.ALL,
      }),
    ).rejects.toThrow('generation failed');
  });

  it('reads the selected occurrence after the series lock instead of using a stale template', async () => {
    const current = {
      ...event,
      recurrenceSeries: { ...series, title: 'Latest committed title' },
    };
    const { service, tx, recurrence } = setup([], current);
    await service.updateRecurringEvent('owner', event, calendar, {
      recurrenceScope: RecurrenceScope.THIS_AND_FOLLOWING,
    });
    expect(recurrence.lockSeries.mock.invocationCallOrder[0]).toBeLessThan(
      tx.calendarEvent.findUnique.mock.invocationCallOrder[0],
    );
    expect(tx.recurrenceSeries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ title: 'Latest committed title' }),
      }),
    );
  });

  it('rejects a stale occurrence already removed by another series edit', async () => {
    const { service, tx } = setup();
    tx.calendarEvent.findUnique.mockResolvedValue(null);
    await expect(
      service.updateRecurringEvent('owner', event, calendar, {
        title: 'Stale edit',
        recurrenceScope: RecurrenceScope.THIS,
      }),
    ).rejects.toThrow('Calendar event not found');
    expect(tx.calendarEvent.update).not.toHaveBeenCalled();
  });
});
