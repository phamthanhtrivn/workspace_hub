import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AttendeeResponseStatus,
  CalendarEvent,
  EventSourceType,
  EventStatus,
  Prisma,
  ReminderDeliveryStatus,
} from '@prisma/client';
import { rrulestr } from 'rrule';
import {
  CALENDAR_DEFAULTS,
  CALENDAR_ERROR_MESSAGES,
} from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';

const recurrenceTemplateInclude = {
  attendees: true,
  reminders: true,
} satisfies Prisma.CalendarEventInclude;

type RecurrenceTemplate = Prisma.CalendarEventGetPayload<{
  include: typeof recurrenceTemplateInclude;
}>;

@Injectable()
export class CalendarRecurrenceService {
  constructor(private readonly prisma: PrismaService) {}

  assertValidRule(rule?: string | null): void {
    if (!rule) return;
    try {
      rrulestr(this.withStart(rule, new Date()), { forceset: true });
    } catch {
      throw new BadRequestException(
        CALENDAR_ERROR_MESSAGES.INVALID_RECURRENCE_RULE,
      );
    }
  }

  async materializeAllSeriesThrough(through: Date): Promise<void> {
    const roots = await this.prisma.calendarEvent.findMany({
      where: {
        recurrenceRule: { not: null },
        recurrenceParentId: null,
        status: { not: EventStatus.CANCELLED },
        OR: [
          { recurrenceGeneratedUntil: null },
          { recurrenceGeneratedUntil: { lt: through } },
        ],
      },
      select: { id: true },
    });

    for (const root of roots) {
      await this.materializeSeriesThrough(root.id, through);
    }
  }

  async materializeSeriesThrough(eventId: string, through: Date): Promise<void> {
    const selected = await this.prisma.calendarEvent.findUnique({
      where: { id: eventId },
      select: { id: true, recurrenceParentId: true },
    });
    if (!selected) return;

    const rootId = selected.recurrenceParentId ?? selected.id;
    const root = await this.prisma.calendarEvent.findUnique({
      where: { id: rootId },
      include: recurrenceTemplateInclude,
    });
    if (!root?.recurrenceRule || root.status === EventStatus.CANCELLED) return;

    const occurrenceStarts = this.getOccurrenceStarts(root, through);
    for (const occurrenceStart of occurrenceStarts) {
      await this.createOccurrence(root, occurrenceStart);
    }

    await this.prisma.calendarEvent.update({
      where: { id: root.id },
      data: { recurrenceGeneratedUntil: through },
    });
  }

  getDefaultGenerationEnd(startAt: Date): Date {
    const end = new Date(startAt);
    end.setUTCMonth(
      end.getUTCMonth() + CALENDAR_DEFAULTS.RECURRENCE_GENERATION_MONTHS,
    );
    return end;
  }

  truncateBefore(rule: string, occurrenceStart: Date): string {
    const until = new Date(occurrenceStart.getTime() - 1);
    const parts = rule
      .split(';')
      .filter((part) => !part.startsWith('COUNT=') && !part.startsWith('UNTIL='));
    parts.push(`UNTIL=${this.toRRuleDate(until)}`);
    return parts.join(';');
  }

  remainingRule(
    rule: string,
    seriesStart: Date,
    occurrenceStart: Date,
  ): string {
    const countPart = rule.split(';').find((part) => part.startsWith('COUNT='));
    if (!countPart) return rule;

    const total = Number(countPart.slice('COUNT='.length));
    const used = rrulestr(this.withStart(rule, seriesStart), { forceset: true })
      .between(seriesStart, occurrenceStart, true).length;
    const remaining = Math.max(1, total - used + 1);
    return rule
      .split(';')
      .map((part) => (part.startsWith('COUNT=') ? `COUNT=${remaining}` : part))
      .join(';');
  }

  private getOccurrenceStarts(
    root: RecurrenceTemplate,
    through: Date,
  ): Date[] {
    const rule = rrulestr(this.withStart(root.recurrenceRule!, root.startAt), {
      forceset: true,
    });
    const exceptions = new Set(
      root.exceptionDates.map((date) => date.toISOString()),
    );

    return rule
      .between(root.startAt, through, true)
      .filter((date) => date.getTime() > root.startAt.getTime())
      .filter((date) => !exceptions.has(date.toISOString()))
      .slice(0, CALENDAR_DEFAULTS.MAX_RECURRENCE_OCCURRENCES);
  }

  private async createOccurrence(
    root: RecurrenceTemplate,
    occurrenceStart: Date,
  ): Promise<void> {
    const existing = await this.prisma.calendarEvent.findUnique({
      where: {
        recurrenceParentId_originalStartAt: {
          recurrenceParentId: root.id,
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
            recurrenceRule: root.recurrenceRule,
            recurrenceParentId: root.id,
            originalStartAt: occurrenceStart,
            exceptionDates: [],
            documentIds: root.documentIds,
            sourceType: EventSourceType.USER,
          },
        });

        if (root.attendees.length > 0) {
          await tx.calendarEventAttendee.createMany({
            data: root.attendees.map((attendee) => ({
              eventId: occurrence.id,
              userId: attendee.userId,
              optional: attendee.optional,
              responseStatus:
                attendee.userId === root.createdBy
                  ? AttendeeResponseStatus.ACCEPTED
                  : attendee.responseStatus,
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

  private withStart(rule: string, startAt: Date): string {
    const normalizedRule = rule.startsWith('RRULE:') ? rule : `RRULE:${rule}`;
    return `DTSTART:${this.toRRuleDate(startAt)}\n${normalizedRule}`;
  }

  private toRRuleDate(date: Date): string {
    return date
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replace(/\.\d{3}Z$/, 'Z');
  }
}
