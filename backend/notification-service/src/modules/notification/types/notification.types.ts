import { Prisma } from "@prisma/client";
import type { NotificationType } from "../dtos/create-notification.dto";

export type NotificationMetadata = Record<string, unknown>;

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
