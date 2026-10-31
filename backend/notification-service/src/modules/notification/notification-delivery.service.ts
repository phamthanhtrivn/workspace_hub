import { Injectable } from "@nestjs/common";
import { Notification } from "@prisma/client";
import { NotificationGateway } from "./notification.gateway";
import { NotificationSubscriptionService } from "./notification-subscription.service";
import {
  NotificationEvent,
  NotificationEventName,
} from "./types/notification.events";

@Injectable()
export class NotificationDeliveryService {
  constructor(
    private readonly gateway: NotificationGateway,
    private readonly subscriptions: NotificationSubscriptionService,
  ) {}

  emitToUser<TPayload>(
    recipientId: string,
    event: NotificationEventName,
    payload: TPayload,
  ): void {
    this.gateway.server.to(recipientId).emit(event, payload);
  }

  deliverCreated(saved: Notification, options: { sendPush?: boolean }): void {
    this.emitToUser(saved.recipientId, NotificationEvent.CREATED, saved);
    if (options.sendPush !== false) {
      this.subscriptions
        .sendPushToUser(saved.recipientId, {
          title: saved.title,
          content: saved.content,
          link: saved.link || undefined,
          senderName: saved.senderName || undefined,
          senderAvatar: saved.senderAvatar || undefined,
        })
        .catch((error: unknown) =>
          console.error("Failed to send push notification:", error),
        );
    }
  }
}
