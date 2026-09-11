export enum NotificationType {
  SPACE_INVITATION = "SPACE_INVITATION",
  SPACE_INVITATION_ACCEPTED = "SPACE_INVITATION_ACCEPTED",
  SPACE_INVITATION_DECLINED = "SPACE_INVITATION_DECLINED",
  SPACE_DISBANDED = "SPACE_DISBANDED",
  SPACE_MEMBER_REMOVED = "SPACE_MEMBER_REMOVED",
  SPACE_OWNERSHIP_TRANSFERRED = "SPACE_OWNERSHIP_TRANSFERRED",
  CHANNEL_DISBANDED = "CHANNEL_DISBANDED",
  CHAT_GROUP_INVITATION = "CHAT_GROUP_INVITATION",
  CHAT_INVITATION_ACCEPTED = "CHAT_INVITATION_ACCEPTED",
  CHAT_INVITATION_DECLINED = "CHAT_INVITATION_DECLINED",
  PROJECT_INVITATION = "PROJECT_INVITATION",
  PROJECT_TASK_ASSIGNED = "PROJECT_TASK_ASSIGNED",
  PROJECT_TASK_UPDATED = "PROJECT_TASK_UPDATED",
  PROJECT_SPRINT_STARTED = "PROJECT_SPRINT_STARTED",
  CALENDAR_REMINDER = "CALENDAR_REMINDER",
  MEETING_INVITATION = "MEETING_INVITATION",
  MEETING_INVITATION_STATUS = "MEETING_INVITATION_STATUS",
  MEETING_INVITATION_DECLINED = "MEETING_INVITATION_DECLINED",
  MEETING_UPDATED = "MEETING_UPDATED",
  MEETING_CANCELLED = "MEETING_CANCELLED",
}

export type NotificationCategory =
  | "ALL"
  | "PROJECT"
  | "CHAT"
  | "CALENDAR"
  | "MEETING"
  | "DOCUMENT";

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

export type ProjectInvitationNotificationStatus =
  "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";

export interface ProjectInvitationMetadata {
  invitationId: string;
  projectId: string;
  projectName: string;
  status: ProjectInvitationNotificationStatus;
  expiresAt?: string | null;
  respondedAt?: string;
}

export type MeetingInvitationNotificationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED";

export interface MeetingInvitationMetadata {
  meetingId: string;
  joinToken: string;
  hostUserId: string;
  title: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  status?: MeetingInvitationNotificationStatus;
  respondedAt?: string;
  declinedUserId?: string;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: NotificationType;
  title: string;
  content: string;
  isRead: boolean;
  link?: string;
  metadata?: Record<string, unknown>;
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
    totalPages: number;
    unreadCount: number;
    categoryUnreadCount?: number;
  };
}
