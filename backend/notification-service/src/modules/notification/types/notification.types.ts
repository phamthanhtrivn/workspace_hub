import { Prisma, NotificationType } from "@prisma/client";

export type NotificationMetadata = Record<string, unknown>;
export type NotificationCategory =
  | "ALL"
  | "PROJECT"
  | "CHAT"
  | "CALENDAR"
  | "MEETING"
  | "DOCUMENT";

const CATEGORY_TYPES: Record<
  Exclude<NotificationCategory, "ALL" | "DOCUMENT">,
  NotificationType[]
> = {
  PROJECT: [
    NotificationType.PROJECT_INVITATION,
    NotificationType.PROJECT_TASK_ASSIGNED,
    NotificationType.PROJECT_TASK_UPDATED,
    NotificationType.PROJECT_SPRINT_STARTED,
  ],
  CHAT: [
    NotificationType.SPACE_INVITATION,
    NotificationType.SPACE_INVITATION_ACCEPTED,
    NotificationType.SPACE_INVITATION_DECLINED,
    NotificationType.SPACE_DISBANDED,
    NotificationType.SPACE_MEMBER_REMOVED,
    NotificationType.SPACE_OWNERSHIP_TRANSFERRED,
    NotificationType.CHANNEL_DISBANDED,
    NotificationType.CHAT_GROUP_INVITATION,
    NotificationType.CHAT_INVITATION_ACCEPTED,
    NotificationType.CHAT_INVITATION_DECLINED,
  ],
  CALENDAR: [NotificationType.CALENDAR_REMINDER],
  MEETING: [
    NotificationType.MEETING_INVITATION,
    NotificationType.MEETING_INVITATION_STATUS,
    NotificationType.MEETING_INVITATION_DECLINED,
    NotificationType.MEETING_UPDATED,
    NotificationType.MEETING_CANCELLED,
  ],
};

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "ALL",
  "PROJECT",
  "CHAT",
  "CALENDAR",
  "MEETING",
  "DOCUMENT",
];

export function isNotificationCategory(
  value: string | undefined,
): value is NotificationCategory {
  return Boolean(
    value && NOTIFICATION_CATEGORIES.includes(value as NotificationCategory),
  );
}

export function getNotificationCategoryWhere(
  category: NotificationCategory,
): NotificationWhereInput {
  if (category === "ALL") return {};
  if (category === "DOCUMENT") {
    return {
      link: { startsWith: "/documents" },
    };
  }
  return {
    type: {
      in: CATEGORY_TYPES[category],
    },
  };
}

export interface PushNotificationPayload {
  title: string;
  content: string;
  link?: string;
  senderName?: string;
  senderAvatar?: string;
}

export interface WebPushSubscriptionRecord {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface KafkaNotificationPayload {
  recipientId?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: NotificationType;
  title: string;
  content: string;
  link?: string;
  metadata?: NotificationMetadata;
}

export interface KafkaNotificationMessage {
  value?: KafkaNotificationPayload;
  [key: string]: unknown;
}

export type NotificationWhereInput = Prisma.NotificationWhereInput;
