import { Prisma } from "@prisma/client";
import type { NotificationType } from "../dtos/create-notification.dto";

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
  string[]
> = {
  PROJECT: [
    "PROJECT_INVITATION",
    "PROJECT_TASK_ASSIGNED",
    "PROJECT_TASK_UPDATED",
    "PROJECT_SPRINT_STARTED",
  ],
  CHAT: [
    "SPACE_INVITATION",
    "SPACE_INVITATION_ACCEPTED",
    "SPACE_INVITATION_DECLINED",
    "SPACE_DISBANDED",
    "SPACE_MEMBER_REMOVED",
    "SPACE_OWNERSHIP_TRANSFERRED",
    "CHANNEL_DISBANDED",
    "CHAT_GROUP_INVITATION",
    "CHAT_INVITATION_ACCEPTED",
    "CHAT_INVITATION_DECLINED",
  ],
  CALENDAR: ["CALENDAR_REMINDER"],
  MEETING: [
    "MEETING_INVITATION",
    "MEETING_INVITATION_STATUS",
    "MEETING_INVITATION_DECLINED",
    "MEETING_UPDATED",
    "MEETING_CANCELLED",
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
      OR: [
        { type: { startsWith: "DOCUMENT_" } },
        { link: { startsWith: "/documents" } },
      ],
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
