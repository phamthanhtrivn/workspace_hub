export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: string; // e.g. 'CHAT', 'INVITATION', 'TASK', 'SYSTEM'
  title: string;
  content: string;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsResponse {
  message: string;
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    unreadCount: number;
  };
}
