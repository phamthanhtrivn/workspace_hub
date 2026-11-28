import { Injectable, Logger } from '@nestjs/common';
import { ReminderEmailStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from './email.service';
import { CalendarReminderPayload } from './events/calendar-reminder.payload';
import { CALENDAR_REMINDER } from './constants/calendar-reminder.constants';

/** A timeout after SMTP DATA is ambiguous: never automatically resend it. */
export function isDefiniteEmailFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const failure = error as {
    responseCode?: number;
    code?: string;
    command?: string;
  };
  if (typeof failure.responseCode === 'number' && failure.responseCode >= 400)
    return true;
  if (failure.command === 'DATA') return false;

  return (
    ['EDNS', 'ECONNECTION', 'ECONNREFUSED', 'EAUTH', 'EENVELOPE'].includes(
      failure.code ?? '',
    ) ||
    (failure.code === 'ETIMEDOUT' && failure.command === 'CONN')
  );
}

@Injectable()
export class CalendarReminderEmailService {
  private readonly logger = new Logger(CalendarReminderEmailService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async deliver(
    payload: CalendarReminderPayload,
    recipient: CalendarReminderPayload['recipients'][number],
  ) {
    const groupKey = payload.groupKey ?? payload.deliveryId;
    const receipt = await this.prisma.reminderEmailDelivery.upsert({
      where: {
        groupKey_recipientId: { groupKey, recipientId: recipient.userId },
      },
      create: { groupKey, recipientId: recipient.userId },
      update: {},
    });
    if (receipt.status === ReminderEmailStatus.PROCESSING) {
      if (
        receipt.claimedAt &&
        receipt.claimedAt.getTime() <
          Date.now() - CALENDAR_REMINDER.EMAIL_LEASE_MS
      ) {
        await this.prisma.reminderEmailDelivery.updateMany({
          where: {
            id: receipt.id,
            status: ReminderEmailStatus.PROCESSING,
            claimedAt: receipt.claimedAt,
          },
          data: {
            status: ReminderEmailStatus.UNKNOWN,
            lastError: CALENDAR_REMINDER.UNKNOWN_EMAIL,
          },
        });
        this.logger.warn(
          `Reminder email ${receipt.id} has an expired SMTP claim; manual review required`,
        );
      } else {
        // Keep the Kafka record retryable until the original owner resolves its lease.
        throw new Error('Calendar reminder email is already processing');
      }

      return;
    }
    if (
      (receipt.status !== ReminderEmailStatus.PENDING &&
        receipt.status !== ReminderEmailStatus.FAILED) ||
      receipt.attempts >= CALENDAR_REMINDER.MAX_EMAIL_ATTEMPTS
    )
      return;
    if (!recipient.email) {
      await this.prisma.reminderEmailDelivery.updateMany({
        where: {
          id: receipt.id,
          status: receipt.status,
          attempts: receipt.attempts,
        },
        data: {
          status: ReminderEmailStatus.SKIPPED,
          lastError: 'Recipient has no email address',
        },
      });
      this.logger.warn(
        `Reminder email ${receipt.id} skipped: recipient has no email address`,
      );

      return;
    }
    // Configuration/URL validation happens before claiming SMTP intent.
    const message = this.email.prepareCalendarReminderEmail({
      recipientEmail: recipient.email,
      recipientName: recipient.fullName,
      eventTitle: payload.event.title,
      ...payload.event,
      minutesBefore: payload.minutesBefore,
      eventUrl: this.eventUrl(payload.event.id),
    });
    const claimedAt = new Date();
    const claim = await this.prisma.reminderEmailDelivery.updateMany({
      where: {
        id: receipt.id,
        status: receipt.status,
        attempts: receipt.attempts,
      },
      data: {
        status: ReminderEmailStatus.PROCESSING,
        claimedAt,
        attempts: { increment: 1 },
        lastError: null,
      },
    });
    if (!claim.count) throw new Error('Calendar reminder email claim changed');
    try {
      await this.email.sendPreparedCalendarReminder(message);
    } catch (error) {
      const definite = isDefiniteEmailFailure(error);
      await this.prisma.reminderEmailDelivery.updateMany({
        where: {
          id: receipt.id,
          status: ReminderEmailStatus.PROCESSING,
          claimedAt,
        },
        data: {
          status: definite
            ? ReminderEmailStatus.FAILED
            : ReminderEmailStatus.UNKNOWN,
          lastError: definite
            ? 'SMTP rejected reminder delivery'
            : CALENDAR_REMINDER.UNKNOWN_EMAIL,
        },
      });
      this.logger.warn(
        `Reminder email ${receipt.id} ${definite ? 'was rejected by SMTP' : 'has an uncertain SMTP outcome; manual review required'}`,
      );
      if (
        definite &&
        receipt.attempts + 1 < CALENDAR_REMINDER.MAX_EMAIL_ATTEMPTS
      )
        throw new Error('Calendar reminder email can be retried');

      return;
    }
    // If this write fails, PROCESSING is deliberately left ambiguous, not resent.
    await this.prisma.reminderEmailDelivery.update({
      where: { id: receipt.id },
      data: {
        status: ReminderEmailStatus.SENT,
        sentAt: new Date(),
        lastError: null,
      },
    });
  }

  private eventUrl(eventId: string) {
    const origin = process.env.FRONTEND_URL;
    if (!origin) throw new Error('FRONTEND_URL is required for reminder email');
    const url = new URL('/calendar', origin);
    if (!['http:', 'https:'].includes(url.protocol))
      throw new Error('Invalid FRONTEND_URL');
    url.searchParams.set('eventId', eventId);

    return url.toString();
  }
}
