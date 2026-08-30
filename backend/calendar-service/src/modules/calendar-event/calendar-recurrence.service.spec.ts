import { BadRequestException } from '@nestjs/common';
import { CalendarRecurrenceService } from './calendar-recurrence.service';

describe('CalendarRecurrenceService', () => {
  const service = new CalendarRecurrenceService({} as never);

  it('rejects malformed RRULE input', () => {
    expect(() => service.assertValidRule('RRULE:FREQ=UNKNOWN')).toThrow(
      BadRequestException,
    );
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
});
