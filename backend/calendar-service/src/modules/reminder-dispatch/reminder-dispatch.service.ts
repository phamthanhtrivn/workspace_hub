import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import { Prisma, ReminderDeliveryStatus } from '@prisma/client';
import { lastValueFrom } from 'rxjs';
import { createHash } from 'node:crypto';
import { KAFKA_CONFIG } from '../../infrastructure/kafka/kafka.constants';
import { CALENDAR_DEFAULTS } from '../../common/constants/calendar.constants';
import { PrismaService } from '../../prisma/prisma.service';

type ReminderWithEvent = Prisma.ReminderGetPayload<{
  include: {
    event: {
      include: { attendees: true; calendar: true; recurrenceSeries: true };
    };
  };
}>;

@Injectable()
export class ReminderDispatchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ReminderDispatchService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(KAFKA_CONFIG.PRODUCER_CLIENT)
    private readonly kafka: ClientKafka,
  ) {}

  async onApplicationBootstrap() {
    await this.kafka.connect();
  }

  @Cron('*/30 * * * * *')
  async dispatchDueReminders(): Promise<void> {
    const now = new Date();
    const reminders = await this.prisma.reminder.findMany({
      where: {
        scheduledAt: { lte: now },
        OR: [
          { deliveryStatus: ReminderDeliveryStatus.PENDING },
          {
            deliveryStatus: ReminderDeliveryStatus.FAILED,
            nextAttemptAt: { lte: now },
          },
          {
            deliveryStatus: ReminderDeliveryStatus.PROCESSING,
            nextAttemptAt: { lte: now },
          },
        ],
        event: { status: { not: 'CANCELLED' } },
      },
      include: {
        event: {
          include: { attendees: true, calendar: true, recurrenceSeries: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });

    for (const reminder of reminders) {
      await this.dispatchOne(reminder);
    }
  }

  @Cron('0 15 2 * * *')
  async cleanupCompletedReminders(): Promise<void> {
    const retentionCutoff = new Date(
      Date.now() - CALENDAR_DEFAULTS.REMINDER_RETENTION_DAYS * 24 * 60 * 60_000,
    );
    await this.prisma.reminder.deleteMany({
      where: {
        deliveryStatus: {
          in: [
            ReminderDeliveryStatus.DISPATCHED,
            ReminderDeliveryStatus.CANCELLED,
            ReminderDeliveryStatus.DEAD_LETTER,
          ],
        },
        updatedAt: { lt: retentionCutoff },
      },
    });
  }

  private async dispatchOne(reminder: ReminderWithEvent): Promise<void> {
    const claimed = await this.prisma.reminder.updateMany({
      where: {
        id: reminder.id,
        deliveryStatus: reminder.deliveryStatus,
        attemptCount: reminder.attemptCount,
        scheduledAt: reminder.scheduledAt,
        event: {
          startAt: reminder.event.startAt,
          status: { not: 'CANCELLED' },
        },
      },
      data: {
        deliveryStatus: ReminderDeliveryStatus.PROCESSING,
        attemptCount: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + 5 * 60_000),
      },
    });
    if (claimed.count === 0) return;
    const claimIdentity: Prisma.ReminderWhereInput = {
      id: reminder.id,
      deliveryStatus: ReminderDeliveryStatus.PROCESSING,
      attemptCount: reminder.attemptCount + 1,
      scheduledAt: reminder.scheduledAt,
      event: { startAt: reminder.event.startAt },
    };

    try {
      const recipientIds = [
        ...new Set(reminder.event.attendees.map((attendee) => attendee.userId)),
      ];
      const profiles = await this.prisma.userProfileSnapshot.findMany({
        where: { userId: { in: recipientIds } },
        select: { userId: true, email: true, fullName: true },
      });
      const profileById = new Map(
        profiles.map((profile) => [profile.userId, profile]),
      );

      await lastValueFrom(
        this.kafka.emit(KAFKA_CONFIG.REMINDER_TOPIC, {
          eventType: 'CALENDAR_REMINDER_DUE',
          deliveryId: reminder.id,
          groupKey: createHash('sha256')
            .update(
              JSON.stringify([
                reminder.event.id,
                reminder.event.startAt.toISOString(),
                reminder.scheduledAt.toISOString(),
              ]),
            )
            .digest('hex'),
          scheduledAt: reminder.scheduledAt.toISOString(),
          minutesBefore: reminder.minutesBefore,
          method: reminder.method,
          event: {
            id: reminder.event.id,
            title: reminder.event.title,
            startAt: reminder.event.startAt.toISOString(),
            location: reminder.event.location,
            description: reminder.event.description,
            endAt: reminder.event.endAt.toISOString(),
            allDay: reminder.event.allDay,
            sourceType: reminder.event.sourceType,
            calendarName: reminder.event.calendar.name,
            timeZone:
              reminder.event.recurrenceSeries?.timeZone ??
              reminder.event.calendar.timeZone,
          },
          recipients: recipientIds.map((userId) => ({
            userId,
            email: profileById.get(userId)?.email ?? null,
            fullName: profileById.get(userId)?.fullName ?? null,
          })),
        }),
      );

      await this.prisma.reminder.updateMany({
        where: claimIdentity,
        data: {
          deliveryStatus: ReminderDeliveryStatus.DISPATCHED,
          dispatchedAt: new Date(),
          nextAttemptAt: null,
          lastError: null,
        },
      });
    } catch (error) {
      const reachedAttemptLimit =
        reminder.attemptCount + 1 >= CALENDAR_DEFAULTS.MAX_REMINDER_ATTEMPTS;
      const retryMinutes = Math.min(
        60,
        2 ** Math.min(reminder.attemptCount + 1, 6),
      );
      await this.prisma.reminder.updateMany({
        where: claimIdentity,
        data: {
          deliveryStatus: reachedAttemptLimit
            ? ReminderDeliveryStatus.DEAD_LETTER
            : ReminderDeliveryStatus.FAILED,
          nextAttemptAt: reachedAttemptLimit
            ? null
            : new Date(Date.now() + retryMinutes * 60_000),
          lastError:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : 'Unknown error',
        },
      });
      this.logger.error(`Reminder ${reminder.id} dispatch failed`, error);
    }
  }
}
