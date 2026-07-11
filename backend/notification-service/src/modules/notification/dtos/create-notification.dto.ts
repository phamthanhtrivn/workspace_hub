import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsEnum,
} from "class-validator";

export enum NotificationType {
  CHAT_GROUP_INVITATION = "CHAT_GROUP_INVITATION",
  CHAT_INVITATION_ACCEPTED = "CHAT_INVITATION_ACCEPTED",
  CHAT_INVITATION_DECLINED = "CHAT_INVITATION_DECLINED",
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
  metadata?: Record<string, any>;
}
