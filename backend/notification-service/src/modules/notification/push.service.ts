import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { pushAgent, PUSH_POLICY, withPushSlot } from './push-policy';
import * as webpush from "web-push";
import {
  PushNotificationPayload,
  WebPushSubscriptionRecord,
} from "./types/notification.types";

interface WebPushError {
  message?: string;
  stack?: string;
  statusCode?: number;
  body?: string;
  response?: {
    body?: string;
  };
}

function isWebPushError(error: unknown): error is WebPushError {
  return typeof error === "object" && error !== null;
}

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
    subscription: WebPushSubscriptionRecord,
    payload: PushNotificationPayload,
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

      await withPushSlot(async () => {
        const agent = await pushAgent(subscription.endpoint);
        try { await webpush.sendNotification(pushSubscription, payloadString, { agent, timeout: PUSH_POLICY.timeout }); }
        finally { agent.destroy(); }
      });
      return true;
    } catch (error: unknown) {
      const webPushError = isWebPushError(error) ? error : {};
      const statusCode = webPushError.statusCode;


      // These statuses mean the subscription is invalid, expired, denied, or mismatched with VAPID details.
      if (
        typeof statusCode === "number" &&
        [400, 403, 404, 410].includes(statusCode)
      ) {
        this.logger.warn(
          `Invalid push subscription (Status ${statusCode})`,
        );
        return false;
      }

      this.logger.error(
        `Failed to send web push notification (Status ${statusCode || "N/A"})`,
      );
      return true; // Keep subscription for general errors (e.g. network timeout)
    }
  }
}
