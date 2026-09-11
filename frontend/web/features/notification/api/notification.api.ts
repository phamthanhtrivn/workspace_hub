import { api } from "@/lib/axios";
import {
  GetNotificationsResponse,
  NotificationCategory,
} from "../types/notification.types";

export const getNotifications = async (
  page = 1,
  limit = 10,
  isRead?: boolean,
  category: NotificationCategory = "ALL",
): Promise<GetNotificationsResponse> => {
  const params: Record<string, string | number | boolean> = { page, limit };
  if (isRead !== undefined) {
    params.isRead = isRead;
  }
  if (category !== "ALL") {
    params.category = category;
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
