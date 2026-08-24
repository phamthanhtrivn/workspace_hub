import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  NOTIFICATION_GATEWAY,
  NotificationGateway,
  ProjectNotification,
} from './communication/project-communication.port';

@Injectable()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(@Inject(NOTIFICATION_GATEWAY) private readonly gateway: NotificationGateway) {}

  async send(event: ProjectNotification): Promise<void> {
    try {
      await this.gateway.send(event);
    } catch (error) {
      this.logger.warn(`Unable to publish notification: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }
}
