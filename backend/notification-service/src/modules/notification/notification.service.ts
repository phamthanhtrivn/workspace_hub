import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { NotificationGateway } from "./notification.gateway";
import { Notification } from "@prisma/client";

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
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
        metadata: createDto.metadata ? (createDto.metadata as any) : null,
      },
    });

    // Publish to realtime socket room
    this.notificationGateway.server
      .to(saved.recipientId)
      .emit("new_notification", saved);

    return saved;
  }

  async getNotifications(
    recipientId: string,
    page = 1,
    limit = 10,
    isRead?: boolean,
  ): Promise<{ list: Notification[]; total: number; unreadCount: number }> {
    const where: any = { recipientId };
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
      this.prisma.notification.count({ where: { recipientId, isRead: false } }),
    ]);

    return { list, total, unreadCount };
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId, isRead: false },
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
      where: { recipientId, isRead: false },
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
}
