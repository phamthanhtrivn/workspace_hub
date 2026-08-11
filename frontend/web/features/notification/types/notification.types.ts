export enum NotificationType {
  SPACE_INVITATION = 'SPACE_INVITATION',
  SPACE_INVITATION_ACCEPTED = 'SPACE_INVITATION_ACCEPTED',
  SPACE_INVITATION_DECLINED = 'SPACE_INVITATION_DECLINED',
  PROJECT_TASK_ASSIGNED = 'PROJECT_TASK_ASSIGNED',
  PROJECT_TASK_UPDATED = 'PROJECT_TASK_UPDATED',
  PROJECT_SPRINT_STARTED = 'PROJECT_SPRINT_STARTED',
}

export interface InvitationMetadata {
  invitationId: string;
  spaceId: string;
  spaceName?: string;
  conversationName?: string;
  conversationAvatarUrl?: string;
}

export interface InvitationResponseMetadata {
  spaceId: string;
  spaceName?: string;
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
