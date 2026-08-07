import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as webpush from "web-push";

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private vapidPublicKey: string;
  private vapidPrivateKey: string;
  private vapidSubject: string;

  onModuleInit() {
    this.vapidSubject = process.env.VAPID_SUBJECT!;
    this.vapidPublicKey = process.env.VAPID_PUBLIC_KEY!;
    this.vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

    webpush.setVapidDetails(
      this.vapidSubject,
      this.vapidPublicKey,
      this.vapidPrivateKey,
    );
  }

  getPublicKey(): string {
    return this.vapidPublicKey;
  }

  async sendPushNotification(
    subscription: { endpoint: string; p256dh: string; auth: string },
    payload: {
      title: string;
      content: string;
      link?: string;
      senderName?: string;
      senderAvatar?: string;
    },
  ): Promise<boolean> {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      };

      const payloadString = JSON.stringify(payload);

      await webpush.sendNotification(pushSubscription, payloadString);
      return true;
    } catch (error: any) {
      // 410 Gone / 404 Not Found means subscription has expired or user has unsubscribed/revoked permissions
      if (error.statusCode === 410 || error.statusCode === 404) {
        this.logger.warn(
          `Subscription has expired (Status ${error.statusCode}). Endpoint: ${subscription.endpoint}`,
        );
        return false; // Return false to indicate the subscription is no longer valid
      }

      this.logger.error(
        `Failed to send web push notification: ${error.message || error}`,
        error.stack,
      );
      return true; // Keep subscription for general errors (e.g. network timeout)
    }
  }
}
