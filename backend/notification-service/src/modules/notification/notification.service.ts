import { Injectable } from "@nestjs/common";
import { CreateNotificationDto } from "./dtos/create-notification.dto";
import { SaveSubscriptionDto } from "./dtos/save-subscription.dto";
import { Notification, PushSubscription } from "@prisma/client";
import {
  NotificationDateRange,
  NotificationCategory,
  NotificationUnreadCountsByCategory,
  PushNotificationPayload,
} from "./types/notification.types";
import { ProjectInvitationResolution } from "./dtos/resolve-project-invitation.dto";
import { NotificationQueryService } from "./notification-query.service";
import { NotificationMutationService } from "./notification-mutation.service";
import { NotificationSubscriptionService } from "./notification-subscription.service";

@Injectable()
export class NotificationService {
  constructor(
    private readonly queries: NotificationQueryService,
    private readonly mutations: NotificationMutationService,
    private readonly subscriptions: NotificationSubscriptionService,
  ) {}
  async createNotification(
    createDto: CreateNotificationDto,
    options: { sendPush?: boolean } = {},
  ): Promise<Notification> {
    return this.mutations.createNotification(createDto, options);
  }

  async getNotifications(
    recipientId: string,
    page = 1,
    limit = 10,
    isRead?: boolean,
    category: NotificationCategory = "ALL",
    dateRange: NotificationDateRange = {},
  ): Promise<{
    list: Notification[];
    total: number;
    unreadCount: number;
    categoryUnreadCount: number;
    unreadCountsByCategory: NotificationUnreadCountsByCategory;
  }> {
    return this.queries.getNotifications(
      recipientId,
      page,
      limit,
      isRead,
      category,
      dateRange,
    );
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.queries.getUnreadCount(recipientId);
  }

  async markAsRead(
    id: string,
    recipientId: string,
  ): Promise<Notification | null> {
    return this.mutations.markAsRead(id, recipientId);
  }

  async markAllAsRead(recipientId: string): Promise<number> {
    return this.mutations.markAllAsRead(recipientId);
  }

  async resolveProjectInvitation(
    invitationId: string,
    recipientId: string,
    status: ProjectInvitationResolution,
  ): Promise<Notification | null> {
    return this.mutations.resolveProjectInvitation(
      invitationId,
      recipientId,
      status,
    );
  }

  async resolveMeetingInvitation(
    meetingId: string,
    recipientId: string,
    status: "ACCEPTED" | "DECLINED" | "CANCELLED",
  ): Promise<Notification | null> {
    return this.mutations.resolveMeetingInvitation(
      meetingId,
      recipientId,
      status,
    );
  }

  async deleteNotification(id: string, recipientId: string): Promise<boolean> {
    return this.mutations.deleteNotification(id, recipientId);
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
    return this.mutations.deleteNotifications(recipientId, category, options);
  }

  async saveSubscription(
    userId: string,
    dto: SaveSubscriptionDto,
  ): Promise<PushSubscription> {
    return this.subscriptions.saveSubscription(userId, dto);
  }

  async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    return this.subscriptions.unsubscribe(userId, endpoint);
  }

  async sendPushToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<void> {
    return this.subscriptions.sendPushToUser(userId, payload);
  }
}
