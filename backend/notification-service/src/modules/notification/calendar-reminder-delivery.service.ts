import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarReminderPayload } from './events/calendar-reminder.payload';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationSubscriptionService } from './notification-subscription.service';
import { NotificationEvent } from './types/notification.events';
import { CALENDAR_REMINDER } from './constants/calendar-reminder.constants';

@Injectable()
export class CalendarReminderDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: NotificationDeliveryService,
    private readonly subscriptions: NotificationSubscriptionService,
  ) {}

  async deliver(payload: CalendarReminderPayload, recipientId: string) {
    const groupKey = payload.groupKey ?? payload.deliveryId;
    const id = payload.groupKey
      ? `calendar:${groupKey}:${recipientId}`
      : `delivery:${groupKey}:${recipientId}`;
    const outcome = await this.prisma.$transaction(async (tx) => {
      // Serialize the two channels for one recipient, including initial creation.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
      const existing = await tx.notification.findUnique({ where: { id } });
      const previous =
        existing?.metadata &&
        typeof existing.metadata === 'object' &&
        !Array.isArray(existing.metadata)
          ? existing.metadata
          : {};
      const previousChannels = Array.isArray(previous.channels)
        ? previous.channels.filter(
            (channel): channel is string => typeof channel === 'string',
          )
        : typeof previous.method === 'string'
          ? [previous.method]
          : [];
      const channels = [
        ...new Set([...previousChannels, payload.method]),
      ].sort();
      const channelAdded = !previousChannels.includes(payload.method);
      // Old PUSH records predate durable claims and must not be replayed on upgrade.
      const legacyPush =
        !payload.groupKey && existing && previousChannels.includes('PUSH');
      const claimPush =
        payload.method === 'PUSH' && !existing?.pushClaimedAt && !legacyPush;
      const metadata: Prisma.InputJsonObject = {
        ...previous,
        deliveryId: payload.deliveryId,
        groupKey,
        eventId: payload.event.id,
        method: channels.includes('PUSH') ? 'PUSH' : 'ALERT',
        channels,
        startAt: payload.event.startAt,
        eventTitle: payload.event.title,
      };
      const content = `${payload.event.title} starts at ${new Intl.DateTimeFormat(
        'en-US',
        {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: payload.event.timeZone ?? 'UTC',
        },
      ).format(
        new Date(payload.event.startAt),
      )} (${payload.event.timeZone ?? 'UTC'})`;
      const values = {
        metadata,
        ...(claimPush ? { pushClaimedAt: new Date() } : {}),
      };
      const saved = existing
        ? channelAdded || claimPush
          ? await tx.notification.update({ where: { id }, data: values })
          : existing
        : await tx.notification.create({
            data: {
              id,
              recipientId,
              type: NotificationType.CALENDAR_REMINDER,
              title: CALENDAR_REMINDER.TITLE,
              content,
              link: `/calendar?eventId=${payload.event.id}`,
              ...values,
            },
          });

      return { saved, created: !existing, changed: channelAdded, claimPush };
    });

    if (outcome.created)
      this.delivery.deliverCreated(outcome.saved, { sendPush: false });
    else if (outcome.changed)
      this.delivery.emitToUser(
        recipientId,
        NotificationEvent.UPDATED,
        outcome.saved,
      );
    if (outcome.claimPush) {
      await this.subscriptions.sendPushToUser(recipientId, {
        title: outcome.saved.title,
        content: outcome.saved.content,
        link: outcome.saved.link ?? undefined,
        tag: `calendar:${groupKey}`,
      });
    }
  }
}
