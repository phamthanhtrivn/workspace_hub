export enum NotificationType {
  CHAT_GROUP_INVITATION = 'CHAT_GROUP_INVITATION',
  CHAT_INVITATION_ACCEPTED = 'CHAT_INVITATION_ACCEPTED',
  CHAT_INVITATION_DECLINED = 'CHAT_INVITATION_DECLINED',
}

export interface InvitationMetadata {
  invitationId: string;
  conversationId: string;
  conversationName?: string;
  conversationAvatarUrl?: string;
}

export interface InvitationResponseMetadata {
  conversationId: string;
  conversationName?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: string; // use string or NotificationType
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
