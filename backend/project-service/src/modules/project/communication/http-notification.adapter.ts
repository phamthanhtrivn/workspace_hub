import { Injectable } from "@nestjs/common";
import { HttpJsonClient } from "../../../common/communication/http-json.client";
import { RuntimeConfigService } from "../../../common/config/runtime-config.service";
import {
  InvitationEmail,
  NotificationGateway,
  ProjectNotification,
} from "./project-communication.port";

@Injectable()
export class HttpNotificationAdapter implements NotificationGateway {
  constructor(
    private readonly http: HttpJsonClient,
    private readonly config: RuntimeConfigService,
  ) {}

  async send(event: ProjectNotification): Promise<void> {
    await this.http.request({
      service: "Notification service",
      url: `${this.config.notificationServiceUrl}/api/notifications/internal`,
      method: "POST",
      headers: this.internalHeaders(),
      body: event,
    });
  }

  async sendInvitationEmail(email: InvitationEmail): Promise<void> {
    await this.http.request({
      service: "Notification service",
      url: `${this.config.notificationServiceUrl}/api/notifications/project-invitations/email`,
      method: "POST",
      headers: this.internalHeaders(),
      body: email,
    });
  }

  async updateProjectInvitationStatus(
    invitationId: string,
    recipientId: string,
    status: "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED",
  ): Promise<void> {
    await this.http.request({
      service: "Notification service",
      url: `${this.config.notificationServiceUrl}/api/notifications/internal/project-invitations/${invitationId}`,
      method: "PATCH",
      headers: this.internalHeaders(),
      body: { recipientId, status },
    });
  }

  private internalHeaders(): Record<string, string> {
    return { "x-internal-service-key": this.config.notificationServiceKey };
  }
}
