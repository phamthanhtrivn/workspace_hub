import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationService } from "../notification.service";
import type { KafkaNotificationPayload } from "../types/notification.types";

@Injectable()
export class SpaceInvitationNotificationHandler {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(payload: KafkaNotificationPayload): Promise<void> {
    if (!payload.recipientId) {
      throw new BadRequestException("Missing notification recipientId");
    }

    await this.notificationService.createNotification({
      recipientId: payload.recipientId,
      senderId: payload.senderId,
      senderName: payload.senderName,
      senderAvatar: payload.senderAvatar,
      type: payload.type,
      title: payload.title,
      content: payload.content,
      link: payload.link,
      metadata: payload.metadata,
    });
  }
}
