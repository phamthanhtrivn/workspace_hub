import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { SaveSubscriptionDto } from "./dtos/save-subscription.dto";
import { NotificationGateway } from "./notification.gateway";
import { PushService } from "./push.service";
import { Notification, Prisma, PushSubscription } from "@prisma/client";
import {
  NotificationWhereInput,
  PushNotificationPayload,
} from "./types/notification.types";
import { ProjectInvitationResolution } from "./dtos/resolve-project-invitation.dto";

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
    private readonly pushService: PushService,
  ) {}

  async createNotification(
    createDto: CreateNotificationDto,
    options: { sendPush?: boolean } = {},
  ): Promise<Notification> {
    const saved = await this.prisma.notification.create({
      data: this.notificationData(createDto),
    });
    this.dispatchCreatedNotification(saved, options.sendPush !== false);
    return saved;
  }

  async createNotificationFromEvent(
    eventId: string,
    eventType: string,
    createDto: CreateNotificationDto,
  ): Promise<Notification | null> {
    const saved = await this.prisma.$transaction(async (tx) => {
      if (!(await this.recordProcessedEvent(tx, eventId, eventType))) return null;

      const notification = await tx.notification.create({
        data: this.notificationData(createDto),
      });
      return notification;
    });

    if (saved) this.dispatchCreatedNotification(saved, true);
    return saved;
  }

  async resolveProjectInvitationFromEvent(
    eventId: string,
    eventType: string,
    invitationId: string,
    recipientId: string,
    status: ProjectInvitationResolution,
  ): Promise<Notification | null> {
    const updated = await this.prisma.$transaction(async (tx) => {
      if (!(await this.recordProcessedEvent(tx, eventId, eventType))) return null;

      const notification = await tx.notification.findFirst({
        where: {
          recipientId,
          type: "PROJECT_INVITATION",
          metadata: { path: ["invitationId"], equals: invitationId },
        },
        orderBy: { createdAt: "desc" },
      });
      if (!notification) {
        throw new Error("Project invitation notification not found");
      }

      const currentMetadata =
        notification.metadata &&
        typeof notification.metadata === "object" &&
        !Array.isArray(notification.metadata)
          ? notification.metadata
          : {};
      const saved = await tx.notification.update({
        where: { id: notification.id },
        data: {
          isRead: true,
          metadata: {
            ...currentMetadata,
            status,
            respondedAt: new Date().toISOString(),
          },
        },
      });
      return saved;
    });

    if (updated) {
      this.notificationGateway.server
        .to(updated.recipientId)
        .emit("notification_updated", updated);
    }
    return updated;
  }

  async hasProcessedEvent(eventId: string): Promise<boolean> {
    return this.eventWasProcessed(this.prisma, eventId);
  }

  async markEventProcessed(eventId: string, eventType: string): Promise<void> {
    await this.recordProcessedEvent(this.prisma, eventId, eventType);
  }

  async getNotifications(
    recipientId: string,
    page = 1,
    limit = 10,
    isRead?: boolean,
  ): Promise<{ list: Notification[]; total: number; unreadCount: number }> {
    const where: NotificationWhereInput = {
      recipientId,
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

  private notificationData(
    createDto: CreateNotificationDto,
  ): Prisma.NotificationUncheckedCreateInput {
    return {
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
    };
  }

  private dispatchCreatedNotification(
    saved: Notification,
    sendPush: boolean,
  ): void {
    this.notificationGateway.server
      .to(saved.recipientId)
      .emit("new_notification", saved);

    if (!sendPush) return;
    this.sendPushToUser(saved.recipientId, {
      title: saved.title,
      content: saved.content,
      link: saved.link || undefined,
      senderName: saved.senderName || undefined,
      senderAvatar: saved.senderAvatar || undefined,
    }).catch((err) =>
      console.error("Failed to send push notification:", err),
    );
  }

  private async eventWasProcessed(
    database: PrismaService | Prisma.TransactionClient,
    eventId: string,
  ): Promise<boolean> {
    const rows = await database.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1 FROM processed_events WHERE event_id = ${eventId}
      ) AS "exists"
    `;
    return rows[0]?.exists === true;
  }

  private async recordProcessedEvent(
    database: PrismaService | Prisma.TransactionClient,
    eventId: string,
    eventType: string,
  ): Promise<boolean> {
    const inserted = await database.$executeRaw`
      INSERT INTO processed_events (event_id, event_type, processed_at)
      VALUES (${eventId}, ${eventType}, NOW())
      ON CONFLICT (event_id) DO NOTHING
    `;
    return inserted === 1;
  }
}
