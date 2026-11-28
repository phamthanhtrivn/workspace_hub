import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Notification } from "@prisma/client";
import {
  NOTIFICATION_CATEGORIES,
  NotificationDateRange,
  getNotificationCategoryWhere,
  NotificationCategory,
  NotificationUnreadCountsByCategory,
  NotificationWhereInput,
} from "./types/notification.types";
import { getNotificationCreatedAtWhere } from "./notification-query.filters";

@Injectable()
export class NotificationQueryService {
  constructor(private readonly prisma: PrismaService) {}
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
    const baseWhere: NotificationWhereInput = {
      recipientId,
    };
    const createdAt = getNotificationCreatedAtWhere(dateRange);
    if (createdAt) {
      baseWhere.createdAt = createdAt;
    }
    const categoryWhere = getNotificationCategoryWhere(category);
    const where: NotificationWhereInput = {
      AND: [baseWhere, categoryWhere],
    };
    if (isRead !== undefined) {
      where.isRead = isRead;
    }
    const skip = (page - 1) * limit;

    const unreadCountQueries = NOTIFICATION_CATEGORIES.map((item) =>
      this.prisma.notification.count({
        where: {
          AND: [baseWhere, getNotificationCategoryWhere(item)],
          isRead: false,
        },
      }),
    );

    const [list, total, ...unreadCounts] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      ...unreadCountQueries,
    ]);

    const unreadCountsByCategory = NOTIFICATION_CATEGORIES.reduce(
      (counts, item, index) => {
        counts[item] = unreadCounts[index] ?? 0;
        return counts;
      },
      {} as NotificationUnreadCountsByCategory,
    );
    const unreadCount = unreadCountsByCategory.ALL;
    const categoryUnreadCount = unreadCountsByCategory[category] ?? unreadCount;

    return {
      list,
      total,
      unreadCount,
      categoryUnreadCount,
      unreadCountsByCategory,
    };
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        recipientId,
        isRead: false,
      },
    });
  }
}
