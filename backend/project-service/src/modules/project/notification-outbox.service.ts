import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { RuntimeConfigService } from "../../common/config/runtime-config.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TaskCalendarEventService } from "./task-calendar-event.service";
import {
  InvitationEmailInput,
  InvitationEmailService,
} from "./invitation-email.service";
import {
  NOTIFICATION_GATEWAY,
  NotificationGateway,
  PROJECT_NOTIFICATION_EVENT_TYPES,
  ProjectNotification,
} from "./communication/project-communication.port";

type OutboxDatabase = PrismaService | Prisma.TransactionClient;

interface OutboxRecord {
  id: string;
  eventType: string;
  payload: Prisma.JsonValue;
  attemptCount: number;
  createdAt: Date;
}

const PROJECT_NOTIFICATION = "PROJECT_NOTIFICATION";
const INVITATION_EMAIL = "INVITATION_EMAIL";
const PROJECT_INVITATION_STATUS = "PROJECT_INVITATION_STATUS";
const LOCK_TIMEOUT_MS = 5 * 60 * 1_000;

class NonRetryableOutboxError extends Error {}

@Injectable()
export class NotificationOutboxService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationOutboxService.name);
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: RuntimeConfigService,
    @Inject(NOTIFICATION_GATEWAY) private readonly gateway: NotificationGateway,
    private readonly invitationEmails: InvitationEmailService,
    private readonly calendarEvents: TaskCalendarEventService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.drain().catch((error: unknown) => this.logDrainError(error));
    }, this.config.outboxPollIntervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueueNotification(
    event: ProjectNotification,
    database: OutboxDatabase = this.prisma,
  ): Promise<void> {
    await this.enqueue(PROJECT_NOTIFICATION, event, database);
  }

  async enqueueInvitationEmail(
    input: InvitationEmailInput,
    database: OutboxDatabase = this.prisma,
  ): Promise<void> {
    await this.enqueue(
      INVITATION_EMAIL,
      {
        ...input,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      },
      database,
    );
  }

  async enqueueProjectInvitationStatus(
    invitationId: string,
    recipientId: string,
    status: "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED",
    database: OutboxDatabase = this.prisma,
  ): Promise<void> {
    await this.enqueue(
      PROJECT_INVITATION_STATUS,
      {
        invitationId,
        recipientId,
        status,
      },
      database,
    );
  }

  async drain(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const records = await this.claimBatch();
      for (const record of records) {
        await this.deliver(record);
      }
    } finally {
      this.isRunning = false;
    }
  }

  private async enqueue(
    eventType: string,
    payload: object,
    database: OutboxDatabase,
  ): Promise<void> {
    await database.$executeRaw`
      INSERT INTO notification_outbox (
        id, event_type, payload, status, attempt_count, next_attempt_at, created_at
      ) VALUES (
        ${crypto.randomUUID()}::uuid,
        ${eventType},
        ${JSON.stringify(payload)}::jsonb,
        'PENDING',
        0,
        NOW(),
        NOW()
      )
    `;
  }

  private claimBatch(): Promise<OutboxRecord[]> {
    const staleBefore = new Date(Date.now() - LOCK_TIMEOUT_MS);
    return this.prisma.$queryRaw<OutboxRecord[]>`
      WITH candidates AS (
        SELECT id
        FROM notification_outbox
        WHERE (
          status IN ('PENDING', 'FAILED')
          AND next_attempt_at IS NOT NULL
          AND next_attempt_at <= NOW()
        ) OR (
          status = 'PROCESSING'
          AND locked_at < ${staleBefore}
        )
        ORDER BY created_at, id
        LIMIT ${this.config.outboxBatchSize}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE notification_outbox AS outbox
      SET status = 'PROCESSING', locked_at = NOW()
      FROM candidates
      WHERE outbox.id = candidates.id
      RETURNING
        outbox.id,
        outbox.event_type AS "eventType",
        outbox.payload,
        outbox.attempt_count AS "attemptCount",
        outbox.created_at AS "createdAt"
    `;
  }

  private async deliver(record: OutboxRecord): Promise<void> {
    try {
      if (record.eventType === PROJECT_NOTIFICATION) {
        const payload = this.toProjectNotification(record.payload);
        await this.gateway.publish({
          ...this.envelope(record, this.notificationAggregateId(payload)),
          eventType: PROJECT_NOTIFICATION_EVENT_TYPES.NOTIFICATION_REQUESTED,
          payload,
        });
      } else if (record.eventType === INVITATION_EMAIL) {
        const input = this.toInvitationEmail(record.payload);
        const payload = await this.invitationEmails.build(input);
        await this.gateway.publish({
          ...this.envelope(record, input.invitationId),
          eventType: PROJECT_NOTIFICATION_EVENT_TYPES.INVITATION_EMAIL_REQUESTED,
          payload,
        });
      } else if (record.eventType === PROJECT_INVITATION_STATUS) {
        const payload = this.toProjectInvitationStatus(record.payload);
        await this.gateway.publish({
          ...this.envelope(record, payload.invitationId),
          eventType: PROJECT_NOTIFICATION_EVENT_TYPES.INVITATION_STATUS_CHANGED,
          payload,
        });
      } else if (record.eventType === "PROJECT_TASK_CALENDAR") {
        if (!this.isObject(record.payload) || typeof record.payload.taskId !== "string") {
          throw new NonRetryableOutboxError("Invalid task calendar payload");
        }
        await this.calendarEvents.deliverUpsert(record.payload.taskId);
      } else {
        throw new NonRetryableOutboxError(
          `Unsupported outbox event type: ${record.eventType}`,
        );
      }
      await this.markSent(record.id);
    } catch (error) {
      await this.markFailed(record, error);
    }
  }

  private async markSent(id: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE notification_outbox
      SET status = 'SENT', processed_at = NOW(), locked_at = NULL, last_error = NULL
      WHERE id = ${id}::uuid AND status = 'PROCESSING'
    `;
  }

  private async markFailed(
    record: OutboxRecord,
    error: unknown,
  ): Promise<void> {
    const attemptCount = record.attemptCount + 1;
    const isDead = error instanceof NonRetryableOutboxError;
    const nextAttemptAt = isDead
      ? null
      : new Date(
          Date.now() +
            Math.min(60_000 * 2 ** (attemptCount - 1), 60 * 60 * 1_000),
        );
    const message = (
      error instanceof Error ? error.message : "Unknown delivery error"
    ).slice(0, 2_000);

    await this.prisma.$executeRaw`
      UPDATE notification_outbox
      SET
        status = ${isDead ? "DEAD" : "FAILED"},
        attempt_count = ${attemptCount},
        next_attempt_at = ${nextAttemptAt},
        locked_at = NULL,
        last_error = ${message}
      WHERE id = ${record.id}::uuid AND status = 'PROCESSING'
    `;
    this.logger.warn(
      `Outbox event ${record.id} ${isDead ? "moved to DEAD" : "delivery failed"} (${attemptCount} attempts): ${message}`,
    );
  }

  private toProjectNotification(
    payload: Prisma.JsonValue,
  ): ProjectNotification {
    if (!this.isObject(payload))
      throw new NonRetryableOutboxError("Invalid project notification payload");
    const { recipientId, senderId, type, title, content, link, metadata } =
      payload;
    if (
      typeof recipientId !== "string" ||
      typeof type !== "string" ||
      typeof title !== "string" ||
      typeof content !== "string"
    ) {
      throw new NonRetryableOutboxError("Invalid project notification payload");
    }
    return {
      recipientId,
      ...(typeof senderId === "string" ? { senderId } : {}),
      type,
      title,
      content,
      ...(typeof link === "string" ? { link } : {}),
      ...(this.isObject(metadata) ? { metadata } : {}),
    };
  }

  private toInvitationEmail(payload: Prisma.JsonValue): InvitationEmailInput {
    if (!this.isObject(payload))
      throw new NonRetryableOutboxError("Invalid invitation email payload");
    const { invitationId, projectName, invitedUserId, inviterId, expiresAt } =
      payload;
    if (
      typeof invitationId !== "string" ||
      typeof projectName !== "string" ||
      typeof invitedUserId !== "string" ||
      typeof inviterId !== "string" ||
      (expiresAt !== null && typeof expiresAt !== "string")
    ) {
      throw new NonRetryableOutboxError("Invalid invitation email payload");
    }
    return {
      invitationId,
      projectName,
      invitedUserId,
      inviterId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    };
  }

  private toProjectInvitationStatus(payload: Prisma.JsonValue): {
    invitationId: string;
    recipientId: string;
    status: "ACCEPTED" | "DECLINED" | "CANCELLED" | "EXPIRED";
  } {
    if (!this.isObject(payload))
      throw new NonRetryableOutboxError(
        "Invalid project invitation status payload",
      );
    const { invitationId, recipientId, status } = payload;
    if (
      typeof invitationId !== "string" ||
      typeof recipientId !== "string" ||
      status !== "ACCEPTED" &&
      status !== "DECLINED" &&
      status !== "CANCELLED" &&
      status !== "EXPIRED"
    ) {
      throw new NonRetryableOutboxError(
        "Invalid project invitation status payload",
      );
    }
    return { invitationId, recipientId, status };
  }

  private envelope(record: OutboxRecord, aggregateId: string) {
    return {
      eventId: record.id,
      schemaVersion: 1 as const,
      producer: "project-service" as const,
      aggregateId,
      occurredAt: record.createdAt.toISOString(),
      deliveryAttempt: 0 as const,
    };
  }

  private notificationAggregateId(notification: ProjectNotification): string {
    const metadata = notification.metadata;
    const candidate = metadata?.invitationId ?? metadata?.taskId ?? metadata?.projectId;
    return typeof candidate === "string" ? candidate : notification.recipientId;
  }

  private isObject(
    value: Prisma.JsonValue | undefined,
  ): value is Prisma.JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private logDrainError(error: unknown): void {
    this.logger.error(
      `Unable to drain notification outbox: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }
}
