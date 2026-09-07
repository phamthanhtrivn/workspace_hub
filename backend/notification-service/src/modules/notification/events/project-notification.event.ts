import { Controller, Inject, Logger } from "@nestjs/common";
import { ClientKafka, EventPattern, Payload } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import {
  KAFKA_TOPICS,
  NOTIFICATION_RETRY_KAFKA_CLIENT,
} from "../../../common/constants/kafka.constants";
import { NotificationService } from "../notification.service";
import { EmailService } from "../email.service";
import {
  NotificationType,
  CreateNotificationDto,
} from "../dtos/create-notification.dto";
import { SendProjectInvitationEmailDto } from "../dtos/send-project-invitation-email.dto";
import { ProjectInvitationResolution } from "../dtos/resolve-project-invitation.dto";
import {
  PROJECT_NOTIFICATION_EVENT_TYPES,
  ProjectNotificationEventEnvelope,
} from "../types/notification.types";

class InvalidProjectNotificationEventError extends Error {}

@Controller()
export class ProjectNotificationEvent {
  private readonly logger = new Logger(ProjectNotificationEvent.name);
  private readonly maxRetries = this.positiveInteger(
    process.env.PROJECT_NOTIFICATION_MAX_RETRIES,
    3,
  );
  private readonly retryBaseDelayMs = this.positiveInteger(
    process.env.PROJECT_NOTIFICATION_RETRY_BASE_DELAY_MS,
    1_000,
  );

  constructor(
    private readonly notifications: NotificationService,
    private readonly email: EmailService,
    @Inject(NOTIFICATION_RETRY_KAFKA_CLIENT)
    private readonly kafka: ClientKafka,
  ) {}

  @EventPattern(KAFKA_TOPICS.PROJECT_NOTIFICATION_TOPIC)
  async handleProjectNotification(@Payload() message: unknown): Promise<void> {
    await this.handle(message, false);
  }

  @EventPattern(KAFKA_TOPICS.PROJECT_NOTIFICATION_RETRY_TOPIC)
  async handleProjectNotificationRetry(@Payload() message: unknown): Promise<void> {
    await this.handle(message, true);
  }

  private async handle(message: unknown, applyRetryDelay: boolean): Promise<void> {
    let event: ProjectNotificationEventEnvelope;
    try {
      event = this.toEnvelope(message);
    } catch (error) {
      await this.publishMalformed(message, error);
      return;
    }

    try {
      if (applyRetryDelay && event.deliveryAttempt > 0) {
        await this.delay(
          Math.min(
            this.retryBaseDelayMs * 2 ** (event.deliveryAttempt - 1),
            30_000,
          ),
        );
      }
      await this.process(event);
    } catch (error) {
      await this.routeFailure(event, error);
    }
  }

  private async process(event: ProjectNotificationEventEnvelope): Promise<void> {
    switch (event.eventType) {
      case PROJECT_NOTIFICATION_EVENT_TYPES.NOTIFICATION_REQUESTED:
        await this.notifications.createNotificationFromEvent(
          event.eventId,
          event.eventType,
          this.toNotification(event.payload),
        );
        return;
      case PROJECT_NOTIFICATION_EVENT_TYPES.INVITATION_EMAIL_REQUESTED:
        if (await this.notifications.hasProcessedEvent(event.eventId)) return;
        await this.email.sendProjectInvitationEmail(
          this.toInvitationEmail(event.payload),
        );
        await this.notifications.markEventProcessed(
          event.eventId,
          event.eventType,
        );
        return;
      case PROJECT_NOTIFICATION_EVENT_TYPES.INVITATION_STATUS_CHANGED: {
        const payload = this.toInvitationStatus(event.payload);
        await this.notifications.resolveProjectInvitationFromEvent(
          event.eventId,
          event.eventType,
          payload.invitationId,
          payload.recipientId,
          payload.status,
        );
        return;
      }
      default:
        throw new InvalidProjectNotificationEventError(
          `Unsupported project notification event type: ${event.eventType}`,
        );
    }
  }

  private async routeFailure(
    event: ProjectNotificationEventEnvelope,
    error: unknown,
  ): Promise<void> {
    const message = this.errorMessage(error);
    const shouldDeadLetter =
      error instanceof InvalidProjectNotificationEventError ||
      event.deliveryAttempt >= this.maxRetries;

    if (shouldDeadLetter) {
      await this.publish(KAFKA_TOPICS.PROJECT_NOTIFICATION_DLT_TOPIC, {
        ...event,
        failedAt: new Date().toISOString(),
        failure: message,
      });
      this.logger.error(
        `Project notification event ${event.eventId} moved to DLT: ${message}`,
      );
      return;
    }

    const retryEvent = {
      ...event,
      deliveryAttempt: event.deliveryAttempt + 1,
      lastFailure: message,
    };
    await this.publish(KAFKA_TOPICS.PROJECT_NOTIFICATION_RETRY_TOPIC, retryEvent);
    this.logger.warn(
      `Project notification event ${event.eventId} scheduled for retry ${retryEvent.deliveryAttempt}/${this.maxRetries}: ${message}`,
    );
  }

  private async publishMalformed(message: unknown, error: unknown): Promise<void> {
    const eventId =
      this.isObject(message) && typeof message.eventId === "string"
        ? message.eventId
        : crypto.randomUUID();
    await this.publish(KAFKA_TOPICS.PROJECT_NOTIFICATION_DLT_TOPIC, {
      eventId,
      eventType: "MALFORMED_PROJECT_NOTIFICATION_EVENT",
      schemaVersion: 1,
      producer: "notification-service",
      aggregateId: eventId,
      occurredAt: new Date().toISOString(),
      deliveryAttempt: 0,
      payload: this.isObject(message) ? message : { raw: String(message) },
      failedAt: new Date().toISOString(),
      failure: this.errorMessage(error),
    });
    this.logger.error(
      `Malformed project notification event ${eventId} moved to DLT: ${this.errorMessage(error)}`,
    );
  }

  private publish(topic: string, event: Record<string, unknown>): Promise<void> {
    return lastValueFrom(
      this.kafka.emit(topic, {
        key:
          typeof event.aggregateId === "string"
            ? event.aggregateId
            : String(event.eventId),
        value: event,
        headers: {
          "event-id": String(event.eventId),
          "event-type": String(event.eventType),
        },
      }),
    );
  }

  private toEnvelope(message: unknown): ProjectNotificationEventEnvelope {
    const candidate =
      this.isObject(message) && this.isObject(message.value)
        ? message.value
        : message;
    if (!this.isObject(candidate)) {
      throw new InvalidProjectNotificationEventError("Event must be an object");
    }
    const requiredStrings = [
      "eventId",
      "eventType",
      "producer",
      "aggregateId",
      "occurredAt",
    ];
    if (requiredStrings.some((key) => typeof candidate[key] !== "string")) {
      throw new InvalidProjectNotificationEventError(
        "Event envelope is missing required string fields",
      );
    }
    if (
      candidate.schemaVersion !== 1 ||
      candidate.producer !== "project-service" ||
      !Number.isInteger(candidate.deliveryAttempt) ||
      Number(candidate.deliveryAttempt) < 0 ||
      !this.isObject(candidate.payload)
    ) {
      throw new InvalidProjectNotificationEventError(
        "Event envelope version, producer, attempt, or payload is invalid",
      );
    }
    return candidate as unknown as ProjectNotificationEventEnvelope;
  }

  private toNotification(payload: Record<string, unknown>): CreateNotificationDto {
    const recipientId = this.requiredString(payload, "recipientId");
    const type = this.requiredString(payload, "type");
    if (!Object.values(NotificationType).includes(type as NotificationType)) {
      throw new InvalidProjectNotificationEventError(
        `Unsupported notification type: ${type}`,
      );
    }
    return {
      recipientId,
      type: type as NotificationType,
      title: this.requiredString(payload, "title"),
      content: this.requiredString(payload, "content"),
      ...this.optionalString(payload, "senderId"),
      ...this.optionalString(payload, "link"),
      ...(this.isObject(payload.metadata) ? { metadata: payload.metadata } : {}),
    };
  }

  private toInvitationEmail(
    payload: Record<string, unknown>,
  ): SendProjectInvitationEmailDto {
    const expiresAt = payload.expiresAt;
    if (expiresAt !== null && expiresAt !== undefined && typeof expiresAt !== "string") {
      throw new InvalidProjectNotificationEventError("Invalid expiresAt");
    }
    return {
      recipientEmail: this.requiredString(payload, "recipientEmail"),
      projectName: this.requiredString(payload, "projectName"),
      invitationId: this.requiredString(payload, "invitationId"),
      acceptUrl: this.requiredString(payload, "acceptUrl"),
      ...this.optionalString(payload, "recipientName"),
      ...this.optionalString(payload, "inviterName"),
      ...(typeof expiresAt === "string" ? { expiresAt } : {}),
    };
  }

  private toInvitationStatus(payload: Record<string, unknown>): {
    invitationId: string;
    recipientId: string;
    status: ProjectInvitationResolution;
  } {
    const status = this.requiredString(payload, "status");
    if (
      !Object.values(ProjectInvitationResolution).includes(
        status as ProjectInvitationResolution,
      )
    ) {
      throw new InvalidProjectNotificationEventError(
        `Unsupported invitation status: ${status}`,
      );
    }
    return {
      invitationId: this.requiredString(payload, "invitationId"),
      recipientId: this.requiredString(payload, "recipientId"),
      status: status as ProjectInvitationResolution,
    };
  }

  private requiredString(
    value: Record<string, unknown>,
    key: string,
  ): string {
    const candidate = value[key];
    if (typeof candidate !== "string" || !candidate.trim()) {
      throw new InvalidProjectNotificationEventError(`Missing ${key}`);
    }
    return candidate;
  }

  private optionalString(
    value: Record<string, unknown>,
    key: string,
  ): Record<string, string> {
    const candidate = value[key];
    return typeof candidate === "string" ? { [key]: candidate } : {};
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private errorMessage(error: unknown): string {
    return (error instanceof Error ? error.message : "Unknown error").slice(
      0,
      2_000,
    );
  }

  private delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
}
