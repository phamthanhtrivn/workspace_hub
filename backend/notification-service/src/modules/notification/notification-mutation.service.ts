import { NotificationEvent } from "./types/notification.events";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { Notification, Prisma } from "@prisma/client";
import {
  NotificationDateRange,
  getNotificationCategoryWhere,
  NotificationCategory,
  NotificationWhereInput,
} from "./types/notification.types";
import { ProjectInvitationResolution } from "./dtos/resolve-project-invitation.dto";
import { NotificationDeliveryService } from "./notification-delivery.service";
import { getNotificationCreatedAtWhere } from "./notification-query.filters";

@Injectable()
export class NotificationMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: NotificationDeliveryService,
  ) {}
  async createNotification(
    createDto: CreateNotificationDto,
    options: { sendPush?: boolean } = {},
  ): Promise<Notification> {
    const deliveryId =
      createDto.metadata && typeof createDto.metadata.deliveryId === "string"
        ? createDto.metadata.deliveryId
        : null;
    const deduplicationId = deliveryId
      ? `delivery:${deliveryId}:${createDto.recipientId}`
      : undefined;
    let saved: Notification;
    try {
      saved = await this.prisma.notification.create({
        data: {
          ...(deduplicationId ? { id: deduplicationId } : {}),
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
    } catch (error) {
      if (
        deduplicationId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return this.prisma.notification.findUniqueOrThrow({
          where: { id: deduplicationId },
        });
      }
      throw error;
    }

    this.delivery.deliverCreated(saved, options);

    return saved;
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

    const updated = await this.prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
    this.delivery.emitToUser(recipientId, NotificationEvent.CHANGED, {
      reason: "READ",
      notificationId: id,
    });
    return updated;
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        recipientId,
        isRead: false,
      },
      data: { isRead: true },
    });
    this.delivery.emitToUser(recipientId, NotificationEvent.CHANGED, {
      reason: "READ_ALL",
    });
    return result.count;
  }

  async resolveProjectInvitation(
    invitationId: string,
    recipientId: string,
    status: ProjectInvitationResolution,
  ): Promise<Notification | null> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        recipientId,
        type: "PROJECT_INVITATION",
        metadata: { path: ["invitationId"], equals: invitationId },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!notification) return null;

    const currentMetadata =
      notification.metadata &&
      typeof notification.metadata === "object" &&
      !Array.isArray(notification.metadata)
        ? notification.metadata
        : {};
    const updated = await this.prisma.notification.update({
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

    this.delivery.emitToUser(
      updated.recipientId,
      NotificationEvent.UPDATED,
      updated,
    );
    return updated;
  }

  async resolveMeetingInvitation(
    meetingId: string,
    recipientId: string,
    status: "ACCEPTED" | "DECLINED" | "CANCELLED",
  ): Promise<Notification | null> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        recipientId,
        type: "MEETING_INVITATION",
        metadata: { path: ["meetingId"], equals: meetingId },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!notification) return null;

    const currentMetadata =
      notification.metadata &&
      typeof notification.metadata === "object" &&
      !Array.isArray(notification.metadata)
        ? notification.metadata
        : {};
    const updated = await this.prisma.notification.update({
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

    this.delivery.emitToUser(
      updated.recipientId,
      NotificationEvent.UPDATED,
      updated,
    );
    return updated;
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
    this.delivery.emitToUser(recipientId, NotificationEvent.DELETED, {
      id: notification.id,
    });
    return true;
  }

  async deleteNotifications(
    recipientId: string,
    category: NotificationCategory = "ALL",
    options: {
      isRead?: boolean;
      dateRange?: NotificationDateRange;
    } = {},
  ): Promise<{
    deletedCount: number;
    unreadDeletedCount: number;
    category: NotificationCategory;
    isRead?: boolean;
    fromDate?: string;
    toDate?: string;
  }> {
    const baseWhere: NotificationWhereInput = { recipientId };
    const createdAt = getNotificationCreatedAtWhere(options.dateRange ?? {});
    if (createdAt) {
      baseWhere.createdAt = createdAt;
    }
    const where: NotificationWhereInput = {
      AND: [baseWhere, getNotificationCategoryWhere(category)],
    };
    if (options.isRead !== undefined) {
      where.isRead = options.isRead;
    }
    const unreadWhere: NotificationWhereInput = {
      AND: [where, { isRead: false }],
    };

    const [unreadDeletedCount, deleteResult] = await this.prisma.$transaction([
      this.prisma.notification.count({ where: unreadWhere }),
      this.prisma.notification.deleteMany({ where }),
    ]);
    const payload = {
      deletedCount: deleteResult.count,
      unreadDeletedCount,
      category,
      isRead: options.isRead,
      fromDate: options.dateRange?.fromDate?.toISOString(),
      toDate: options.dateRange?.toDate?.toISOString(),
    };

    this.delivery.emitToUser(recipientId, NotificationEvent.BATCH_DELETED, payload);

    return payload;
  }
}
