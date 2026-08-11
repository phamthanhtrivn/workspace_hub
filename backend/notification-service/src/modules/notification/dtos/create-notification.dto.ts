import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsEnum,
} from "class-validator";
import type { NotificationMetadata } from "../types/notification.types";

export enum NotificationType {
  SPACE_INVITATION = "SPACE_INVITATION",
  SPACE_INVITATION_ACCEPTED = "SPACE_INVITATION_ACCEPTED",
  SPACE_INVITATION_DECLINED = "SPACE_INVITATION_DECLINED",
  CHAT_GROUP_INVITATION = "CHAT_GROUP_INVITATION",
  CHAT_INVITATION_ACCEPTED = "CHAT_INVITATION_ACCEPTED",
  CHAT_INVITATION_DECLINED = "CHAT_INVITATION_DECLINED",
  CHAT_NEW_MESSAGE = "CHAT_NEW_MESSAGE",
  PROJECT_TASK_ASSIGNED = "PROJECT_TASK_ASSIGNED",
  PROJECT_TASK_UPDATED = "PROJECT_TASK_UPDATED",
  PROJECT_SPRINT_STARTED = "PROJECT_SPRINT_STARTED",
}

export class CreateNotificationDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsOptional()
  senderId?: string;

  @IsString()
  @IsOptional()
  senderName?: string;

  @IsString()
  @IsOptional()
  senderAvatar?: string;

  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsObject()
  @IsOptional()
  metadata?: NotificationMetadata;
}
