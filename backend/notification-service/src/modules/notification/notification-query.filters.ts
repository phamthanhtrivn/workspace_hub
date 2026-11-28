import { Prisma } from "@prisma/client";
import { NotificationDateRange } from "./types/notification.types";

export function getNotificationCreatedAtWhere(
  dateRange: NotificationDateRange,
): Prisma.DateTimeFilter | undefined {
  const createdAt: Prisma.DateTimeFilter = {};
  if (dateRange.fromDate) {
    createdAt.gte = dateRange.fromDate;
  }
  if (dateRange.toDate) {
    createdAt.lte = dateRange.toDate;
  }
  return Object.keys(createdAt).length > 0 ? createdAt : undefined;
}
