import { Injectable, Logger } from '@nestjs/common';

type ProjectNotification = {
  recipientId: string;
  senderId?: string;
  type: string;
  title: string;
  content: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  async send(event: ProjectNotification): Promise<void> {
    const url = process.env.NOTIFICATION_SERVICE_URL;
    if (!url) return;

    try {
      const response = await fetch(`${url}/api/notifications/internal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-key': process.env.NOTIFICATION_INTERNAL_SERVICE_KEY || 'local-internal-key',
        },
        body: JSON.stringify(event),
      });
      if (!response.ok) {
        this.logger.warn(`Notification service returned ${response.status}`);
      }
    } catch (error) {
      this.logger.warn(`Unable to publish notification: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}
