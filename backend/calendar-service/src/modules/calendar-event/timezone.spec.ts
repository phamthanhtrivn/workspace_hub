import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSync } from 'class-validator';
import type { Calendar, Prisma } from '@prisma/client';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { RecurrenceCreationService } from './recurrence-creation.service';
import { RecurrenceEntireMutationService } from './recurrence-entire-mutation.service';
import type { EventWithRelations } from './calendar-event.types';
import { RecurrenceScope } from '../../common/enums/calendar.enum';

function eventDto(timeZone: string) {
  return Object.assign(new CreateCalendarEventDto(), {
    calendarId: '7d92796f-e87e-4e0b-b3e9-6c62187cf722', title: 'Weekly review',
    startAt: '2026-11-22T02:00:00.000Z', endAt: '2026-11-22T03:00:00.000Z',
    recurrenceRule: 'FREQ=WEEKLY', timeZone,
  });
}

test('recurrence timezone metadata rejects invalid zones at the DTO boundary', () => {
  assert.equal(validateSync(eventDto('America/New_York')).length, 0);
  assert.ok(validateSync(eventDto('Mars/Base')).some(error => error.property === 'timeZone'));
});

test('a new recurring series captures the account zone while keeping submitted UTC instants', async () => {
  let saved: Record<string, unknown> = {};
  const transaction = { recurrenceSeries: { create: async ({ data }: { data: Record<string, unknown> }) => {
    saved = data;
    return { ...data, id: 'series' };
  } } };
  type Dependencies = ConstructorParameters<typeof RecurrenceCreationService>;
  const service = new RecurrenceCreationService(
    { $transaction: async (operation: (tx: typeof transaction) => Promise<string>) => operation(transaction) } as unknown as Dependencies[0],
    { createSeriesRelations: async () => {} } as unknown as Dependencies[1],
    {} as Dependencies[2],
    { materializeSeries: async () => {}, findFirstSeriesOccurrenceId: async () => 'event' } as unknown as Dependencies[3],
  );
  await service.createRecurringEvent('user', { id: 'calendar', color: '#22396F', timeZone: 'Asia/Ho_Chi_Minh' } as Calendar, eventDto('America/New_York'), [], []);
  assert.equal(saved.timeZone, 'America/New_York');
  assert.equal((saved.startAt as Date).toISOString(), '2026-11-22T02:00:00.000Z');
});

test('editing a series title does not replace its original zone with the calendar zone', async () => {
  let saved: Record<string, unknown> = {};
  const transaction = {
    recurrenceSeries: { update: async ({ data }: { data: Record<string, unknown> }) => { saved = data; } },
    calendarEvent: { findMany: async () => [] },
  };
  type Dependencies = ConstructorParameters<typeof RecurrenceEntireMutationService>;
  const service = new RecurrenceEntireMutationService(
    { assertHasOccurrence: (_rule: string, _start: Date, zone: string) => assert.equal(zone, 'America/New_York') } as unknown as Dependencies[0],
    { replaceSeriesRelations: async () => {} } as unknown as Dependencies[1],
    { assertSeriesRange: () => {}, getCancelledAt: () => undefined } as unknown as Dependencies[2],
  );
  const startAt = new Date('2026-11-22T14:00:00Z'), endAt = new Date('2026-11-22T15:00:00Z');
  await service.updateEntireSeries('user', {
    id: 'event', startAt, endAt,
    recurrenceSeries: { id: 'series', calendarId: 'calendar', timeZone: 'America/New_York', startAt, endAt, recurrenceRule: 'FREQ=WEEKLY' },
  } as EventWithRelations, { id: 'calendar', timeZone: 'Asia/Ho_Chi_Minh' } as Calendar, { title: 'Renamed', recurrenceScope: RecurrenceScope.ALL }, transaction as unknown as Prisma.TransactionClient);
  assert.equal(saved.timeZone, 'America/New_York');
  assert.equal(saved.recurrenceGeneratedUntil, undefined);
});
