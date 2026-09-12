import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsEnum,
} from "class-validator";
import { NotificationType } from "@prisma/client";
import type { NotificationMetadata } from "../types/notification.types";

export { NotificationType };

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
