import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { SaveSubscriptionDto } from "./dtos/save-subscription.dto";
import { NotificationGateway } from "./notification.gateway";
import { PushService } from "./push.service";
import { Notification, Prisma, PushSubscription } from "@prisma/client";
import { KAFKA_EVENTS } from "../../common/constants/kafka.constants";
import {
  NotificationWhereInput,
  PushNotificationPayload,
} from "./types/notification.types";

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly pushService: PushService,
  ) {}

  async createNotification(
    createDto: CreateNotificationDto,
  ): Promise<Notification> {
    const saved = await this.prisma.notification.create({
      data: {
        recipientId: createDto.recipientId,
        senderId: createDto.senderId,
        senderName: createDto.senderName,
        senderAvatar: createDto.senderAvatar,
        type: createDto.type,
        title: createDto.title,
        content: createDto.content,
        link: createDto.link,
        metadata: createDto.metadata
          ? (createDto.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    // Publish to realtime socket room
    this.notificationGateway.server
      .to(saved.recipientId)
      .emit("new_notification", saved);

    // Send push notification in the background
    this.sendPushToUser(saved.recipientId, {
      title: saved.title,
      content: saved.content,
      link: saved.link || undefined,
      senderName: saved.senderName || undefined,
      senderAvatar: saved.senderAvatar || undefined,
    }).catch(err => console.error("Failed to send push notification:", err));

    return saved;
  }


  async getNotifications(
    recipientId: string,
    page = 1,
    limit = 10,
    isRead?: boolean,
  ): Promise<{ list: Notification[]; total: number; unreadCount: number }> {
    const where: NotificationWhereInput = {
      recipientId,
      type: { not: KAFKA_EVENTS.NOTIFICATION.CHAT_NEW_MESSAGE },
    };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const skip = (page - 1) * limit;

    const [list, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: {
          recipientId,
          isRead: false,
          type: { not: KAFKA_EVENTS.NOTIFICATION.CHAT_NEW_MESSAGE },
        },
      }),
    ]);

    return { list, total, unreadCount };
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientId,
        isRead: false,
        type: { not: KAFKA_EVENTS.NOTIFICATION.CHAT_NEW_MESSAGE },
      },
    });
  }

  async markAsRead(
    id: string,
    recipientId: string,
  ): Promise<Notification | null> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId },
    });

    if (!notification) {
      return null;
    }

    return this.prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId,
        isRead: false,
        type: { not: KAFKA_EVENTS.NOTIFICATION.CHAT_NEW_MESSAGE },
      },
      data: { isRead: true },
    });
    return result.count;
  }

  async deleteNotification(id: string, recipientId: string): Promise<boolean> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId },
    });

    if (!notification) {
      return false;
    }

    await this.prisma.notification.delete({
      where: { id: notification.id },
    });
    return true;
  }

  async saveSubscription(
    userId: string,
    dto: SaveSubscriptionDto,
  ): Promise<PushSubscription> {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: dto.endpoint },
    });

    if (existing) {
      if (existing.userId === userId) {
        return existing;
      }
      return this.prisma.pushSubscription.update({
        where: { endpoint: dto.endpoint },
        data: {
          userId,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
        },
      });
    }

    return this.prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
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
        const success = await this.pushService.sendPushNotification(sub, payload);
        if (!success) {
          await this.prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch((err) =>
              console.error(`Failed to delete expired subscription ${sub.id}:`, err),
            );
        }
      }),
    );
  }
}

