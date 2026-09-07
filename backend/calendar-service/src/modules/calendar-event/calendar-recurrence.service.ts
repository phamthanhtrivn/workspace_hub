import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  AttendeeResponseStatus,
  EventSourceType,
  EventStatus,
  Prisma,
  ReminderDeliveryStatus,
} from '@prisma/client';
import { RRuleSet, rrulestr } from 'rrule';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';

const recurrenceTemplateInclude = {
  attendees: true,
  reminders: true,
  documents: true,
  exceptions: true,
} satisfies Prisma.RecurrenceSeriesInclude;

type RecurrenceTemplate = Prisma.RecurrenceSeriesGetPayload<{
  include: typeof recurrenceTemplateInclude;
}>;

const SUPPORTED_FREQUENCIES = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
const SUPPORTED_PARTS = new Set([
  'FREQ',
  'INTERVAL',
  'COUNT',
  'UNTIL',
  'BYDAY',
  'WKST',
]);
const WEEKDAY_PATTERN = /^-?[1-5]?(MO|TU|WE|TH|FR|SA|SU)$/;

@Injectable()
export class CalendarRecurrenceService {
  private readonly logger = new Logger(CalendarRecurrenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  assertValidRule(rule?: string | null): void {
    if (!rule) return;

    try {
      const parts = this.parseRuleParts(rule);
      const frequency = parts.get('FREQ')?.toUpperCase();
      if (!frequency || !SUPPORTED_FREQUENCIES.has(frequency)) {
        throw new BadRequestException(
          CALENDAR_ERROR_MESSAGES.UNSUPPORTED_RECURRENCE_FREQUENCY,
        );
      }

      if (
        (parts.has('INTERVAL') &&
          this.parseBoundedInteger(parts.get('INTERVAL'), 1, 365) === null) ||
        (parts.has('COUNT') &&
          this.parseBoundedInteger(parts.get('COUNT'), 1, 10_000) === null) ||
        (parts.has('COUNT') && parts.has('UNTIL'))
      ) {
        throw new Error('invalid recurrence bounds');
      }

      const byDay = parts.get('BYDAY');
      if (
        byDay &&
        byDay.split(',').some((weekday) => !WEEKDAY_PATTERN.test(weekday))
      ) {
        throw new Error('invalid weekday');
      }

      rrulestr(this.withStart(rule, new Date(), 'UTC'), { forceset: true });
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_RECURRENCE_RULE,
      );
    }
  }

  @Cron('0 5 * * * *')
  async materializeRollingWindow(): Promise<void> {
    const through = this.getDefaultGenerationEnd(new Date());
    const seriesList = await this.prisma.recurrenceSeries.findMany({
      where: {
        status: { not: EventStatus.CANCELLED },
        OR: [
          { recurrenceGeneratedUntil: null },
          { recurrenceGeneratedUntil: { lt: through } },
        ],
      },
      select: { id: true },
      orderBy: [{ recurrenceGeneratedUntil: 'asc' }, { id: 'asc' }],
      take: CALENDAR_DEFAULTS.RECURRENCE_WORKER_BATCH_SIZE,
    });

    for (const series of seriesList) {
      try {
        await this.materializeSeriesThrough(series.id, through);
      } catch (error) {
        this.logger.error(
          `Failed to materialize recurrence series ${series.id}`,
          error,
        );
      }
    }
  }

  async materializeSeriesThrough(
    seriesId: string,
    through: Date,
  ): Promise<void> {
    const series = await this.prisma.recurrenceSeries.findUnique({
      where: { id: seriesId },
      include: recurrenceTemplateInclude,
    });
    if (!series || series.status === EventStatus.CANCELLED) return;

    const { occurrenceStarts, generatedThrough } = this.getOccurrenceStarts(
      series,
      through,
    );
    for (const occurrenceStart of occurrenceStarts) {
      await this.createOccurrence(series, occurrenceStart);
    }

    await this.prisma.recurrenceSeries.update({
      where: { id: series.id },
      data: { recurrenceGeneratedUntil: generatedThrough },
    });
  }

  getDefaultGenerationEnd(startAt: Date): Date {
    return new Date(
      startAt.getTime() +
        CALENDAR_DEFAULTS.RECURRENCE_GENERATION_DAYS * 24 * 60 * 60_000,
    );
  }

  truncateBefore(
    rule: string,
    occurrenceStart: Date,
    timeZone = 'UTC',
  ): string {
    const prefix = /^RRULE:/i.test(rule) ? 'RRULE:' : '';
    const until = new Date(
      this.toFloatingDate(occurrenceStart, timeZone).getTime() - 1,
    );
    const parts = this.normalizeRule(rule)
      .split(';')
      .filter(
        (part) => !part.startsWith('COUNT=') && !part.startsWith('UNTIL='),
      );
    parts.push(`UNTIL=${this.toUtcRRuleDate(until)}`);
    return `${prefix}${parts.join(';')}`;
  }

  remainingRule(
    rule: string,
    seriesStart: Date,
    occurrenceStart: Date,
    timeZone = 'UTC',
  ): string {
    const prefix = /^RRULE:/i.test(rule) ? 'RRULE:' : '';
    const normalizedRule = this.normalizeRule(rule);
    const countPart = normalizedRule
      .split(';')
      .find((part) => part.startsWith('COUNT='));
    if (!countPart) return `${prefix}${normalizedRule}`;

    const total = Number(countPart.slice('COUNT='.length));
    const ruleSet = this.createRuleSet(normalizedRule, seriesStart, timeZone);
    let used = 0;
    let cursor = new Date(
      this.toFloatingDate(seriesStart, timeZone).getTime() - 1,
    );
    const occurrenceCursor = this.toFloatingDate(occurrenceStart, timeZone);
    while (used < total) {
      const next = ruleSet.after(cursor, false);
      if (!next || next > occurrenceCursor) break;
      used += 1;
      cursor = next;
    }
    const remaining = Math.max(1, total - used + 1);
    return `${prefix}${normalizedRule
      .split(';')
      .map((part) => (part.startsWith('COUNT=') ? `COUNT=${remaining}` : part))
      .join(';')}`;
  }

  private getOccurrenceStarts(
    root: RecurrenceTemplate,
    through: Date,
  ): { occurrenceStarts: Date[]; generatedThrough: Date } {
    const rule = this.createRuleSet(
      root.recurrenceRule,
      root.startAt,
      root.timeZone,
    );
    const exceptions = new Set(
      root.exceptions.map((exception) =>
        exception.occurrenceStart.toISOString(),
      ),
    );
    let cursor = root.recurrenceGeneratedUntil
      ? this.toFloatingDate(root.recurrenceGeneratedUntil, root.timeZone)
      : new Date(
          this.toFloatingDate(root.startAt, root.timeZone).getTime() - 1,
        );
    const occurrenceStarts: Date[] = [];
    let scannedCandidates = 0;

    while (
      scannedCandidates < CALENDAR_DEFAULTS.MAX_RECURRENCE_OCCURRENCES_PER_BATCH
    ) {
      const nextFloating = rule.after(cursor, false);
      if (!nextFloating) {
        return { occurrenceStarts, generatedThrough: through };
      }
      cursor = nextFloating;
      scannedCandidates += 1;
      const next = this.fromFloatingDate(nextFloating, root.timeZone);
      if (next > through) {
        return { occurrenceStarts, generatedThrough: through };
      }
      if (!exceptions.has(next.toISOString())) occurrenceStarts.push(next);
    }

    return { occurrenceStarts, generatedThrough: cursor };
  }

  private async createOccurrence(
    root: RecurrenceTemplate,
    occurrenceStart: Date,
  ): Promise<void> {
    const existing = await this.prisma.calendarEvent.findUnique({
      where: {
        recurrenceSeriesId_originalStartAt: {
          recurrenceSeriesId: root.id,
          originalStartAt: occurrenceStart,
        },
      },
      select: { id: true },
    });
    if (existing) return;

    const duration = root.endAt.getTime() - root.startAt.getTime();
    const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);

    try {
      await this.prisma.$transaction(async (tx) => {
        const occurrence = await tx.calendarEvent.create({
          data: {
            calendarId: root.calendarId,
            recurrenceSeriesId: root.id,
            createdBy: root.createdBy,
            updatedBy: root.updatedBy,
            title: root.title,
            description: root.description,
            location: root.location,
            startAt: occurrenceStart,
            endAt: occurrenceEnd,
            allDay: root.allDay,
            color: root.color,
            status: root.status,
            visibility: root.visibility,
            originalStartAt: occurrenceStart,
            isRecurrenceOverride: false,
            sourceType: EventSourceType.USER,
          },
        });

        if (root.documents.length > 0) {
          await tx.calendarEventDocument.createMany({
            data: root.documents.map((document) => ({
              eventId: occurrence.id,
              documentId: document.documentId,
            })),
          });
        }

        if (root.attendees.length > 0) {
          await tx.calendarEventAttendee.createMany({
            data: root.attendees.map((attendee) => ({
              eventId: occurrence.id,
              userId: attendee.userId,
              optional: attendee.optional,
              responseStatus:
                attendee.userId === root.createdBy
                  ? AttendeeResponseStatus.ACCEPTED
                  : AttendeeResponseStatus.NEEDS_ACTION,
            })),
          });
        }

        if (root.reminders.length > 0) {
          await tx.reminder.createMany({
            data: root.reminders.map((reminder) => ({
              eventId: occurrence.id,
              minutesBefore: reminder.minutesBefore,
              method: reminder.method,
              scheduledAt: new Date(
                occurrenceStart.getTime() - reminder.minutesBefore * 60_000,
              ),
              deliveryStatus: ReminderDeliveryStatus.PENDING,
            })),
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }
      throw error;
    }
  }

  private parseRuleParts(rule: string): Map<string, string> {
    if (/\r|\n/.test(rule)) throw new Error('multi-line rules are forbidden');
    const parts = new Map<string, string>();

    for (const component of this.normalizeRule(rule).split(';')) {
      const separator = component.indexOf('=');
      if (separator <= 0 || separator === component.length - 1) {
        throw new Error('invalid recurrence component');
      }
      const key = component.slice(0, separator).toUpperCase();
      const value = component.slice(separator + 1).toUpperCase();
      if (!SUPPORTED_PARTS.has(key) || parts.has(key)) {
        throw new Error('unsupported or duplicate recurrence component');
      }
      parts.set(key, value);
    }
    return parts;
  }

  private parseBoundedInteger(
    value: string | undefined,
    minimum: number,
    maximum: number,
  ): number | null {
    if (value === undefined || !/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    return parsed >= minimum && parsed <= maximum ? parsed : null;
  }

  private createRuleSet(
    rule: string,
    startAt: Date,
    timeZone: string,
  ): RRuleSet {
    return rrulestr(this.withStart(rule, startAt, timeZone), {
      forceset: true,
    }) as RRuleSet;
  }

  private withStart(rule: string, startAt: Date, timeZone: string): string {
    const start = this.toUtcRRuleDate(this.toFloatingDate(startAt, timeZone));
    return `DTSTART:${start}\nRRULE:${this.normalizeRule(rule)}`;
  }

  private normalizeRule(rule: string): string {
    return rule.replace(/^RRULE:/i, '').toUpperCase();
  }

  private getZonedParts(date: Date, timeZone: string) {
    return Object.fromEntries(
      new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(date)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
  }

  private toFloatingDate(date: Date, timeZone: string): Date {
    const values = this.getZonedParts(date, timeZone);
    return new Date(
      Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
        date.getUTCMilliseconds(),
      ),
    );
  }

  private fromFloatingDate(date: Date, timeZone: string): Date {
    const desiredTime = date.getTime();
    let candidate = desiredTime;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const values = this.getZonedParts(new Date(candidate), timeZone);
      const representedLocalTime = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
        date.getUTCMilliseconds(),
      );
      const correction = desiredTime - representedLocalTime;
      if (correction === 0) break;
      candidate += correction;
    }

    return new Date(candidate);
  }

  private toUtcRRuleDate(date: Date): string {
    return date
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replace(/\.\d{3}Z$/, 'Z');
  }
}
