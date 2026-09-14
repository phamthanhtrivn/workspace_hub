import { api } from "@/lib/axios";
import {
  DeleteNotificationsResponse,
  GetNotificationsResponse,
  NotificationCategory,
  NotificationDateRange,
} from "../types/notification.types";

export const getNotifications = async (
  page = 1,
  limit = 10,
  isRead?: boolean,
  category: NotificationCategory = "ALL",
  dateRange: NotificationDateRange = {},
): Promise<GetNotificationsResponse> => {
  const params: Record<string, string | number | boolean> = { page, limit };
  if (isRead !== undefined) {
    params.isRead = isRead;
  }
  if (category !== "ALL") {
    params.category = category;
  }
  if (dateRange.fromDate) {
    params.fromDate = dateRange.fromDate;
  }
  if (dateRange.toDate) {
    params.toDate = dateRange.toDate;
  }
  const response = await api.get("/api/notifications", { params });
  return response.data;
};

export const getUnreadCount = async (): Promise<{ message: string; data: { unreadCount: number } }> => {
  const response = await api.get("/api/notifications/unread-count");
  return response.data;
};

export const markAsRead = async (id: string): Promise<unknown> => {
  const response = await api.patch(`/api/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async (): Promise<unknown> => {
  const response = await api.put("/api/notifications/read-all");
  return response.data;
};

export const deleteNotification = async (id: string): Promise<unknown> => {
  const response = await api.delete(`/api/notifications/${id}`);
  return response.data;
};

export const deleteNotifications = async (
  category: NotificationCategory = "ALL",
  options: {
    isRead?: boolean;
    dateRange?: NotificationDateRange;
  } = {},
): Promise<DeleteNotificationsResponse> => {
  const params: Record<string, string | boolean> = {};
  if (category !== "ALL") {
    params.category = category;
  }
  if (options.isRead !== undefined) {
    params.isRead = options.isRead;
  }
  if (options.dateRange?.fromDate) {
    params.fromDate = options.dateRange.fromDate;
  }
  if (options.dateRange?.toDate) {
    params.toDate = options.dateRange.toDate;
  }
  const response = await api.delete("/api/notifications", { params });
  return response.data;
};
