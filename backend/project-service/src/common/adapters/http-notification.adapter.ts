import { Inject, Injectable } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { HttpJsonClient } from "./http-json.client";
import { RuntimeConfigService } from "../config/runtime-config.service";
import { PROJECT_KAFKA_CLIENT } from "../../infrastructure/kafka/project-kafka.module";
import { KAFKA_TOPICS } from "../constants/kafka.constants";
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
    @Inject(PROJECT_KAFKA_CLIENT) private readonly kafka: ClientKafka,
  ) {}

  async send(event: ProjectNotification): Promise<void> {
    await lastValueFrom(
      this.kafka.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: event.recipientId,
        value: event,
      }),
    );
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
