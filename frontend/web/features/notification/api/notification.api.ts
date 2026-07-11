import { api } from "@/lib/axios";
import { GetNotificationsResponse } from "../types/notification.types";

export const getNotifications = async (
  page = 1,
  limit = 20,
  isRead?: boolean,
): Promise<GetNotificationsResponse> => {
  const params: any = { page, limit };
  if (isRead !== undefined) {
    params.isRead = isRead;
  }
  const response = await api.get("/api/notifications", { params });
  return response.data;
};

export const getUnreadCount = async (): Promise<{ message: string; data: { unreadCount: number } }> => {
  const response = await api.get("/api/notifications/unread-count");
  return response.data;
};

export const markAsRead = async (id: string): Promise<any> => {
  const response = await api.patch(`/api/notifications/${id}/read`);
  return response.data;
};

export const markAllAsRead = async (): Promise<any> => {
  const response = await api.put("/api/notifications/read-all");
  return response.data;
};

export const deleteNotification = async (id: string): Promise<any> => {
  const response = await api.delete(`/api/notifications/${id}`);
  return response.data;
};
