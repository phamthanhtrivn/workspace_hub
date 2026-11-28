import { timingSafeEqual } from 'node:crypto';
import { assertPushEndpoint, PUSH_POLICY } from './push-policy';
import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { SaveSubscriptionDto } from "./dtos/save-subscription.dto";
import { PushService } from "./push.service";
import { PushSubscription } from "@prisma/client";
import { PushNotificationPayload } from "./types/notification.types";

@Injectable()
export class NotificationSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}
  async saveSubscription(
    userId: string,
    dto: SaveSubscriptionDto,
  ): Promise<PushSubscription> {
    assertPushEndpoint(dto.endpoint);
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`;
      const existing = await tx.pushSubscription.findUnique({ where: { endpoint: dto.endpoint } });
      if (existing) {
        const supplied = Buffer.from(dto.keys.auth), saved = Buffer.from(existing.auth);
        if (existing.userId !== userId && (existing.p256dh !== dto.keys.p256dh || supplied.length !== saved.length || !timingSafeEqual(supplied, saved)))
          throw new ForbiddenException('This push subscription belongs to another account');
        if (existing.userId !== userId && await tx.pushSubscription.count({ where: { userId } }) >= PUSH_POLICY.subscriptions)
          throw new BadRequestException('Too many push subscriptions');
        return tx.pushSubscription.update({ where: { id: existing.id }, data: { userId, p256dh: dto.keys.p256dh, auth: dto.keys.auth } });
      }
      if (await tx.pushSubscription.count({ where: { userId } }) >= PUSH_POLICY.subscriptions)
        throw new BadRequestException('Too many push subscriptions');
      return tx.pushSubscription.create({ data: { userId, endpoint: dto.endpoint, p256dh: dto.keys.p256dh, auth: dto.keys.auth } });
    });
  }

  async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    const existing = await this.prisma.pushSubscription.findFirst({
      where: { userId, endpoint },
    });

    if (!existing) return false;

    await this.prisma.pushSubscription.delete({
      where: { id: existing.id },
    });
    return true;
  }

  async sendPushToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<void> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions || subscriptions.length === 0) return;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const success = await this.pushService.sendPushNotification(
          sub,
          payload,
        );
        if (!success) {
          await this.prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch((err) =>
              console.error(
                `Failed to delete expired subscription ${sub.id}:`,
                err,
              ),
            );
        }
      }),
    );
  }
}
