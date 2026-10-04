import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { PrismaClient, Calendar, ReminderMethod } from '@prisma/client';
import { RecurrenceScope } from '../../common/enums/calendar.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarRecurrenceService } from './calendar-recurrence.service';
import { RecurrenceMutationService } from './recurrence-mutation.service';
import { EventRelationService } from './event-relation.service';
import { eventWithRelationsInclude } from './calendar-event.types';

// Opt in against a local PostgreSQL database; every record belongs to a test calendar.
const integration =
  process.env.TEST_RECURRENCE_DATABASE === '1' ? describe : describe.skip;
integration('Recurrence transactions (PostgreSQL)', () => {
  let prisma: PrismaClient;
  let recurrence: CalendarRecurrenceService;
  let mutations: RecurrenceMutationService;
  let calendar: Calendar;
  const owner = randomUUID();
  const startAt = '2026-10-05T02:00:00.000Z';
  const endAt = '2026-10-05T03:00:00.000Z';

  beforeAll(() => {
    config({ quiet: true });
    prisma = new PrismaClient();
    recurrence = new CalendarRecurrenceService(prisma as PrismaService);
    mutations = new RecurrenceMutationService(
      prisma as PrismaService,
      recurrence,
      new EventRelationService(),
    );
  });
  beforeEach(async () => {
    calendar = await prisma.calendar.create({
      data: {
        ownerUserId: owner,
        name: 'Recurrence integration fixture',
        timeZone: 'Asia/Bangkok',
        color: '#2563eb',
      },
    });
  });
  afterEach(async () => {
    if (calendar) await prisma.calendar.delete({ where: { id: calendar.id } });
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function create(
    rule = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;COUNT=9',
  ) {
    const id = await mutations.createRecurringEvent(
      owner,
      calendar,
      {
        calendarId: calendar.id,
        title: 'Custom series fixture',
        startAt,
        endAt,
        recurrenceRule: rule,
      },
      [{ userId: owner }],
      [{ minutesBefore: 10, method: ReminderMethod.ALERT }],
    );
    return prisma.calendarEvent.findUniqueOrThrow({
      where: { id },
      include: eventWithRelationsInclude,
    });
  }

  it('keeps THIS identity on repeated moves and never recreates the original slot', async () => {
    const event = await create();
    for (const hour of ['04', '05']) {
      const current = await prisma.calendarEvent.findUniqueOrThrow({
        where: { id: event.id },
        include: eventWithRelationsInclude,
      });
      expect(
        await mutations.updateRecurringEvent(owner, current, calendar, {
          startAt: `2026-10-05T${hour}:00:00.000Z`,
          endAt: `2026-10-05T${hour}:30:00.000Z`,
          recurrenceScope: RecurrenceScope.THIS,
        }),
      ).toBe(event.id);
    }
    await recurrence.materializeSeriesThrough(
      event.recurrenceSeriesId!,
      new Date('2027-05-01T00:00:00Z'),
    );
    const slots = await prisma.calendarEvent.findMany({
      where: { recurrenceSeriesId: event.recurrenceSeriesId! },
    });
    expect(slots).toHaveLength(9);
    expect(slots.find(({ id }) => id === event.id)?.originalStartAt).toEqual(
      new Date(startAt),
    );
    expect(
      slots.filter(
        ({ startAt }) => startAt.toISOString() === '2026-10-05T02:00:00.000Z',
      ),
    ).toHaveLength(0);
  }, 30_000);

  it('serializes worker generation with a middle-series split and keeps remaining COUNT', async () => {
    const first = await create();
    const selected = (
      await prisma.calendarEvent.findMany({
        where: { recurrenceSeriesId: first.recurrenceSeriesId! },
        orderBy: { originalStartAt: 'asc' },
        include: eventWithRelationsInclude,
      })
    )[3];
    await Promise.all([
      mutations.updateRecurringEvent(owner, selected, calendar, {
        title: 'Following fixture',
        recurrenceScope: RecurrenceScope.THIS_AND_FOLLOWING,
      }),
      recurrence.materializeSeriesThrough(
        first.recurrenceSeriesId!,
        new Date('2027-05-01T00:00:00Z'),
      ),
    ]);
    const slots = await prisma.calendarEvent.findMany({
      where: { calendarId: calendar.id },
      orderBy: { startAt: 'asc' },
    });
    expect(slots).toHaveLength(9);
    expect(
      new Set(slots.map(({ startAt }) => startAt.toISOString())).size,
    ).toBe(9);
    expect(
      slots.filter(
        ({ recurrenceSeriesId }) =>
          recurrenceSeriesId === first.recurrenceSeriesId,
      ),
    ).toHaveLength(3);
    expect(
      await prisma.reminder.count({
        where: { event: { calendarId: calendar.id } },
      }),
    ).toBe(9);
    const next = await prisma.recurrenceSeries.findFirstOrThrow({
      where: {
        calendarId: calendar.id,
        id: { not: first.recurrenceSeriesId! },
      },
    });
    expect(next.recurrenceRule).toContain('COUNT=6');
  }, 30_000);

  it('rolls back an invalid regenerated rule including deleted slots and reminders', async () => {
    const event = await create();
    const ids = (
      await prisma.calendarEvent.findMany({
        where: { calendarId: calendar.id },
      })
    )
      .map(({ id }) => id)
      .sort();
    await expect(
      mutations.updateRecurringEvent(owner, event, calendar, {
        recurrenceRule: 'FREQ=DAILY;UNTIL=20250101T000000Z',
        recurrenceScope: RecurrenceScope.ALL,
      }),
    ).rejects.toThrow('Invalid recurrence rule');
    expect(
      (
        await prisma.calendarEvent.findMany({
          where: { calendarId: calendar.id },
        })
      )
        .map(({ id }) => id)
        .sort(),
    ).toEqual(ids);
    expect(
      await prisma.reminder.count({
        where: { event: { calendarId: calendar.id } },
      }),
    ).toBe(9);
  }, 30_000);

  it('makes a waiting worker read the committed new rule, including when an override exists', async () => {
    const event = await create();
    await mutations.updateRecurringEvent(owner, event, calendar, {
      title: 'Only this fixture',
      recurrenceScope: RecurrenceScope.THIS,
    });
    const current = await prisma.calendarEvent.findUniqueOrThrow({
      where: { id: event.id },
      include: eventWithRelationsInclude,
    });
    await expect(
      mutations.updateRecurringEvent(owner, current, calendar, {
        recurrenceRule: 'FREQ=DAILY;UNTIL=20250101T000000Z',
        recurrenceScope: RecurrenceScope.ALL,
      }),
    ).rejects.toThrow('Invalid recurrence rule');

    let acquired!: () => void;
    let release!: () => void;
    const acquiredLock = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const releaseLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const originalRecurrence = new CalendarRecurrenceService(
      prisma as PrismaService,
    );
    const lock = jest
      .spyOn(recurrence, 'lockSeries')
      .mockImplementationOnce(async (tx, id) => {
        await originalRecurrence.lockSeries(tx, id);
        acquired();
        await releaseLock;
      });
    const updating = mutations.updateRecurringEvent(owner, current, calendar, {
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO;COUNT=3',
      recurrenceScope: RecurrenceScope.ALL,
    });
    await acquiredLock;
    const worker = recurrence.materializeSeriesThrough(
      event.recurrenceSeriesId!,
      new Date('2027-05-01T00:00:00Z'),
    );
    release();
    try {
      await Promise.all([updating, worker]);
    } finally {
      lock.mockRestore();
    }
    const slots = await prisma.calendarEvent.findMany({
      where: { calendarId: calendar.id },
    });
    expect(slots).toHaveLength(3);
    expect(
      new Set(
        slots.map(({ originalStartAt }) => originalStartAt!.toISOString()),
      ).size,
    ).toBe(3);
    expect(
      await prisma.reminder.count({
        where: { event: { calendarId: calendar.id } },
      }),
    ).toBe(3);
  }, 30_000);
});
