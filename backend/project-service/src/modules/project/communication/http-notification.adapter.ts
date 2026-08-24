import { Injectable } from '@nestjs/common';
import { HttpJsonClient } from '../../../common/communication/http-json.client';
import { RuntimeConfigService } from '../../../common/config/runtime-config.service';
import {
  InvitationEmail,
  NotificationGateway,
  ProjectNotification,
} from './project-communication.port';

@Injectable()
export class HttpNotificationAdapter implements NotificationGateway {
  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
  ) {}

  async send(event: ProjectNotification): Promise<void> {
    const url = this.config.notificationServiceUrl;
    if (!url) return;
    await this.http.request({
      service: 'Notification service',
      url: `${url}/api/notifications/internal`,
      method: 'POST',
      headers: this.internalHeaders(),
      body: event,
    });
  }

  async sendInvitationEmail(email: InvitationEmail): Promise<void> {
    const url = this.config.notificationServiceUrl ?? 'http://localhost:8084';
    await this.http.request({
      service: 'Notification service',
      url: `${url}/api/notifications/project-invitations/email`,
      method: 'POST',
      headers: this.internalHeaders(),
      body: email,
    });
  }

  private internalHeaders(): Record<string, string> {
    const serviceKey = this.config.notificationServiceKey;
    if (!serviceKey) throw new Error('Internal notification service key is not configured');
    return { 'x-internal-service-key': serviceKey };
  }
}
