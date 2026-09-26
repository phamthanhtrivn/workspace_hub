import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { AttendeeResponseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { CalendarNotificationService } from './calendar-notification.service';

type OutboxDatabase = PrismaService | Prisma.TransactionClient;

interface OutboxRecord {
  id: string;
  eventType: string;
  payload: Prisma.JsonValue;
  attemptCount: number;
}

interface EventInvitationPayload {
  eventTitle: string;
  eventId: string;
  recipientId: string;
  creatorId: string;
}

interface AttendeeResponsePayload {
  eventTitle: string;
  eventId: string;
  recipientId: string;
  responderId: string;
  status: AttendeeResponseStatus;
}

interface EventCancellationPayload {
  eventTitle: string;
  eventId: string;
  recipientId: string;
  cancellerId: string;
}

interface AttendeeRemovalPayload {
  eventTitle: string;
  eventId: string;
  recipientId: string;
  removerId: string;
}

interface EventUpdatePayload {
  eventTitle: string;
  eventId: string;
  recipientId: string;
  updaterId: string;
}

const EVENT_INVITATION = 'CALENDAR_EVENT_INVITATION';
const ATTENDEE_RESPONSE = 'CALENDAR_ATTENDEE_RESPONSE';
const EVENT_CANCELLATION = 'CALENDAR_EVENT_CANCELLATION';
const ATTENDEE_REMOVED = 'CALENDAR_ATTENDEE_REMOVED';
const EVENT_UPDATE = 'CALENDAR_EVENT_UPDATE';
const LOCK_TIMEOUT_MS = 5 * 60_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 10;

@Injectable()
export class CalendarNotificationOutboxService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(CalendarNotificationOutboxService.name);
  private readonly pollIntervalMs = this.positiveInteger(
    process.env.NOTIFICATION_OUTBOX_POLL_INTERVAL_MS,
    DEFAULT_POLL_INTERVAL_MS,
  );
  private readonly batchSize = this.positiveInteger(
    process.env.NOTIFICATION_OUTBOX_BATCH_SIZE,
    DEFAULT_BATCH_SIZE,
  );
  private readonly maxAttempts = this.positiveInteger(
    process.env.NOTIFICATION_OUTBOX_MAX_ATTEMPTS,
    DEFAULT_MAX_ATTEMPTS,
  );
  private timer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: UserProfileSnapshotService,
    private readonly notifications: CalendarNotificationService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.drain().catch((error: unknown) => this.logDrainError(error));
    }, this.pollIntervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueueEventInvitations(
    database: OutboxDatabase,
    params: {
      eventTitle: string;
      eventId: string;
      creatorId: string;
      recipientIds: string[];
    },
  ): Promise<void> {
    const recipientIds = [
      ...new Set(
        params.recipientIds.filter(
          (recipientId) => recipientId && recipientId !== params.creatorId,
        ),
      ),
    ];
    if (recipientIds.length === 0) return;

    for (const recipientId of recipientIds) {
      await this.enqueue(database, EVENT_INVITATION, {
        eventTitle: params.eventTitle,
        eventId: params.eventId,
        recipientId,
        creatorId: params.creatorId,
      });
    }
  }

  async enqueueEventCancellation(
    database: OutboxDatabase,
    params: {
      eventTitle: string;
      eventId: string;
      cancellerId: string;
      recipientIds: string[];
    },
  ): Promise<void> {
    const recipientIds = [
      ...new Set(
        params.recipientIds.filter(
          (recipientId) => recipientId && recipientId !== params.cancellerId,
        ),
      ),
    ];
    if (recipientIds.length === 0) return;

    for (const recipientId of recipientIds) {
      await this.enqueue(database, EVENT_CANCELLATION, {
        eventTitle: params.eventTitle,
        eventId: params.eventId,
        recipientId,
        cancellerId: params.cancellerId,
      });
    }
  }

  async enqueueAttendeeRemoval(
    database: OutboxDatabase,
    params: {
      eventTitle: string;
      eventId: string;
      removerId: string;
      recipientIds: string[];
    },
  ): Promise<void> {
    const recipientIds = [
      ...new Set(
        params.recipientIds.filter(
          (recipientId) => recipientId && recipientId !== params.removerId,
        ),
      ),
    ];
    if (recipientIds.length === 0) return;

    for (const recipientId of recipientIds) {
      await this.enqueue(database, ATTENDEE_REMOVED, {
        eventTitle: params.eventTitle,
        eventId: params.eventId,
        recipientId,
        removerId: params.removerId,
      });
    }
  }

  async enqueueEventUpdate(
    database: OutboxDatabase,
    params: {
      eventTitle: string;
      eventId: string;
      updaterId: string;
      recipientIds: string[];
    },
  ): Promise<void> {
    const recipientIds = [
      ...new Set(
        params.recipientIds.filter(
          (recipientId) => recipientId && recipientId !== params.updaterId,
        ),
      ),
    ];
    if (recipientIds.length === 0) return;

    for (const recipientId of recipientIds) {
      await this.enqueue(database, EVENT_UPDATE, {
        eventTitle: params.eventTitle,
        eventId: params.eventId,
        recipientId,
        updaterId: params.updaterId,
      });
    }
  }

  async enqueueAttendeeResponse(
    database: OutboxDatabase,
    payload: AttendeeResponsePayload,
  ): Promise<void> {
    if (!payload.recipientId || payload.recipientId === payload.responderId) {
      return;
    }
    await this.enqueue(database, ATTENDEE_RESPONSE, payload);
  }

  async drain(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const records = await this.claimBatch();
      await Promise.all(records.map((record) => this.deliver(record)));
    } finally {
      this.isRunning = false;
    }
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
        ORDER BY created_at
        LIMIT ${this.batchSize}
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
        outbox.attempt_count AS "attemptCount"
    `;
  }

  private async deliver(record: OutboxRecord): Promise<void> {
    try {
      if (record.eventType === EVENT_INVITATION) {
        await this.deliverEventInvitation(
          this.toEventInvitation(record.payload),
        );
      } else if (record.eventType === ATTENDEE_RESPONSE) {
        await this.deliverAttendeeResponse(
          this.toAttendeeResponse(record.payload),
        );
      } else if (record.eventType === EVENT_CANCELLATION) {
        await this.deliverEventCancellation(
          this.toEventCancellation(record.payload),
        );
      } else if (record.eventType === ATTENDEE_REMOVED) {
        await this.deliverAttendeeRemoval(
          this.toAttendeeRemoval(record.payload),
        );
      } else if (record.eventType === EVENT_UPDATE) {
        await this.deliverEventUpdate(
          this.toEventUpdate(record.payload),
        );
      } else {
        throw new Error(
          `Unsupported calendar outbox event: ${record.eventType}`,
        );
      }
      await this.markSent(record.id);
    } catch (error) {
      await this.markFailed(record, error);
    }
  }

  private async deliverEventInvitation(
    payload: EventInvitationPayload,
  ): Promise<void> {
    const profile = await this.getProfile(payload.creatorId);
    await this.notifications.notifyEventInvitation({
      ...payload,
      creatorName: profile?.fullName || profile?.email,
      creatorAvatar: profile?.avatarUrl,
    });
  }

  private async deliverAttendeeResponse(
    payload: AttendeeResponsePayload,
  ): Promise<void> {
    const profile = await this.getProfile(payload.responderId);
    await this.notifications.notifyAttendeeResponse({
      ...payload,
      responderName: profile?.fullName || profile?.email,
      responderAvatar: profile?.avatarUrl,
    });
  }

  private async deliverEventCancellation(
    payload: EventCancellationPayload,
  ): Promise<void> {
    const profile = await this.getProfile(payload.cancellerId);
    await this.notifications.notifyEventCancellation({
      ...payload,
      cancellerName: profile?.fullName || profile?.email,
      cancellerAvatar: profile?.avatarUrl,
    });
  }

  private async deliverAttendeeRemoval(
    payload: AttendeeRemovalPayload,
  ): Promise<void> {
    const profile = await this.getProfile(payload.removerId);
    await this.notifications.notifyAttendeeRemoval({
      ...payload,
      removerName: profile?.fullName || profile?.email,
      removerAvatar: profile?.avatarUrl,
    });
  }

  private async deliverEventUpdate(
    payload: EventUpdatePayload,
  ): Promise<void> {
    const profile = await this.getProfile(payload.updaterId);
    await this.notifications.notifyEventUpdate({
      ...payload,
      updaterName: profile?.fullName || profile?.email,
      updaterAvatar: profile?.avatarUrl,
    });
  }

  private async getProfile(userId: string) {
    const profiles = await this.profiles.getProfilesByUserIds([userId]);
    return profiles.get(userId);
  }

  private async enqueue(
    database: OutboxDatabase,
    eventType: string,
    payload: object,
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

  private async markSent(id: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE notification_outbox
      SET
        status = 'SENT',
        processed_at = NOW(),
        locked_at = NULL,
        last_error = NULL
      WHERE id = ${id}::uuid AND status = 'PROCESSING'
    `;
  }

  private async markFailed(
    record: OutboxRecord,
    error: unknown,
  ): Promise<void> {
    const attemptCount = record.attemptCount + 1;
    const nextAttemptAt =
      attemptCount >= this.maxAttempts
        ? null
        : new Date(
            Date.now() +
              Math.min(60_000 * 2 ** (attemptCount - 1), 60 * 60_000),
          );
    const message = (
      error instanceof Error ? error.message : 'Unknown delivery error'
    ).slice(0, 2_000);

    await this.prisma.$executeRaw`
      UPDATE notification_outbox
      SET
        status = 'FAILED',
        attempt_count = ${attemptCount},
        next_attempt_at = ${nextAttemptAt},
        locked_at = NULL,
        last_error = ${message}
      WHERE id = ${record.id}::uuid AND status = 'PROCESSING'
    `;
    this.logger.warn(
      `Calendar outbox ${record.id} failed (${attemptCount} attempts): ${message}`,
    );
  }

  private toEventInvitation(value: Prisma.JsonValue): EventInvitationPayload {
    const payload = this.objectPayload(value);
    const { eventTitle, eventId, recipientId, creatorId } = payload;
    if (
      typeof eventTitle !== 'string' ||
      typeof eventId !== 'string' ||
      typeof recipientId !== 'string' ||
      typeof creatorId !== 'string'
    ) {
      throw new Error('Invalid calendar invitation outbox payload');
    }
    return { eventTitle, eventId, recipientId, creatorId };
  }

  private toAttendeeResponse(value: Prisma.JsonValue): AttendeeResponsePayload {
    const payload = this.objectPayload(value);
    const { eventTitle, eventId, recipientId, responderId, status } = payload;
    if (
      typeof eventTitle !== 'string' ||
      typeof eventId !== 'string' ||
      typeof recipientId !== 'string' ||
      typeof responderId !== 'string' ||
      typeof status !== 'string' ||
      !Object.values(AttendeeResponseStatus).includes(
        status as AttendeeResponseStatus,
      )
    ) {
      throw new Error('Invalid calendar response outbox payload');
    }
    return {
      eventTitle,
      eventId,
      recipientId,
      responderId,
      status: status as AttendeeResponseStatus,
    };
  }

  private toEventCancellation(value: Prisma.JsonValue): EventCancellationPayload {
    const payload = this.objectPayload(value);
    const { eventTitle, eventId, recipientId, cancellerId } = payload;
    if (
      typeof eventTitle !== 'string' ||
      typeof eventId !== 'string' ||
      typeof recipientId !== 'string' ||
      typeof cancellerId !== 'string'
    ) {
      throw new Error('Invalid calendar cancellation outbox payload');
    }
    return { eventTitle, eventId, recipientId, cancellerId };
  }

  private toAttendeeRemoval(value: Prisma.JsonValue): AttendeeRemovalPayload {
    const payload = this.objectPayload(value);
    const { eventTitle, eventId, recipientId, removerId } = payload;
    if (
      typeof eventTitle !== 'string' ||
      typeof eventId !== 'string' ||
      typeof recipientId !== 'string' ||
      typeof removerId !== 'string'
    ) {
      throw new Error('Invalid calendar removal outbox payload');
    }
    return { eventTitle, eventId, recipientId, removerId };
  }

  private toEventUpdate(value: Prisma.JsonValue): EventUpdatePayload {
    const payload = this.objectPayload(value);
    const { eventTitle, eventId, recipientId, updaterId } = payload;
    if (
      typeof eventTitle !== 'string' ||
      typeof eventId !== 'string' ||
      typeof recipientId !== 'string' ||
      typeof updaterId !== 'string'
    ) {
      throw new Error('Invalid calendar update outbox payload');
    }
    return { eventTitle, eventId, recipientId, updaterId };
  }

  private objectPayload(value: Prisma.JsonValue): Prisma.JsonObject {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Invalid calendar notification outbox payload');
    }
    return value;
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private logDrainError(error: unknown): void {
    this.logger.error(
      `Unable to drain calendar notification outbox: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    );
  }
}
