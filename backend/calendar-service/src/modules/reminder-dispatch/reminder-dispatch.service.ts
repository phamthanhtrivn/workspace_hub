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
import { KAFKA_CONFIG } from '../../infrastructure/kafka/kafka.constants';
import { PrismaService } from '../../prisma/prisma.service';

type ReminderWithEvent = Prisma.ReminderGetPayload<{
  include: { event: { include: { attendees: true } } };
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
          include: { attendees: true },
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });

    for (const reminder of reminders) {
      await this.dispatchOne(reminder);
    }
  }

  private async dispatchOne(reminder: ReminderWithEvent): Promise<void> {
    const claimed = await this.prisma.reminder.updateMany({
      where: {
        id: reminder.id,
        deliveryStatus: reminder.deliveryStatus,
        attemptCount: reminder.attemptCount,
      },
      data: {
        deliveryStatus: ReminderDeliveryStatus.PROCESSING,
        attemptCount: { increment: 1 },
        nextAttemptAt: new Date(Date.now() + 5 * 60_000),
      },
    });
    if (claimed.count === 0) return;

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
          method: reminder.method,
          event: {
            id: reminder.event.id,
            title: reminder.event.title,
            startAt: reminder.event.startAt.toISOString(),
            location: reminder.event.location,
          },
          recipients: recipientIds.map((userId) => ({
            userId,
            email: profileById.get(userId)?.email ?? null,
            fullName: profileById.get(userId)?.fullName ?? null,
          })),
        }),
      );

      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          deliveryStatus: ReminderDeliveryStatus.DISPATCHED,
          dispatchedAt: new Date(),
          nextAttemptAt: null,
          lastError: null,
        },
      });
    } catch (error) {
      const retryMinutes = Math.min(
        60,
        2 ** Math.min(reminder.attemptCount + 1, 6),
      );
      await this.prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          deliveryStatus: ReminderDeliveryStatus.FAILED,
          nextAttemptAt: new Date(Date.now() + retryMinutes * 60_000),
          lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error',
        },
      });
      this.logger.error(`Reminder ${reminder.id} dispatch failed`, error);
    }
  }
}
