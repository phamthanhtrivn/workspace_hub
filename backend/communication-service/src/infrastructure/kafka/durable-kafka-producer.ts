import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ClientKafka, KafkaOptions } from '@nestjs/microservices';
import { Prisma } from '@prisma/client';
import { Observable, ReplaySubject, firstValueFrom, timeout } from 'rxjs';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NOTIFICATION_OUTBOX } from './notification-outbox.constants';

interface DeliveryRow {
  id: string;
  topic: string;
  message_key: string;
  payload: Prisma.JsonValue;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Preserve the existing emit contract while persisting notification intent before broker delivery. */
export class DurableKafkaProducer
  extends ClientKafka
  implements OnModuleInit, OnModuleDestroy
{
  private readonly outboxLogger = new Logger(DurableKafkaProducer.name);
  private timer?: NodeJS.Timeout;
  private draining = false;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    options: Required<KafkaOptions>['options'],
  ) {
    super(options);
  }

  override async connect() {
    const connection = super.connect();
    const initialization = this.initialized;
    try {
      return await connection;
    } catch (error) {
      // Nest retains a rejected initialization promise; the next outbox attempt must reconnect.
      if (this.initialized === initialization) this.initialized = null;
      throw error;
    }
  }

  override emit<TResult = unknown, TInput = unknown>(
    pattern: unknown,
    envelope: TInput,
    transaction?: Prisma.TransactionClient,
  ): Observable<TResult> {
    // ClientKafka.emit is hot: callers that do not subscribe must still persist their event.
    const result = new ReplaySubject<TResult>(1);
    void this.persist(pattern, envelope, transaction).then(
      () => {
        result.next(undefined as TResult);
        result.complete();
      },
      (error: unknown) => {
        this.outboxLogger.error('Notification intent could not be persisted');
        result.error(error);
      },
    );
    return result.asObservable();
  }

  private async persist(
    pattern: unknown,
    envelope: unknown,
    transaction?: Prisma.TransactionClient,
  ): Promise<void> {
    if (
      typeof pattern !== 'string' ||
      !pattern ||
      !isRecord(envelope) ||
      typeof envelope.key !== 'string' ||
      !isRecord(envelope.value)
    ) {
      throw new Error('Invalid outbound notification contract');
    }
    const id = randomUUID();
    const metadata = isRecord(envelope.value.metadata)
      ? envelope.value.metadata
      : {};
    const payload = JSON.stringify({
      ...envelope.value,
      metadata: {
        ...metadata,
        deliveryId:
          typeof metadata.deliveryId === 'string' ? metadata.deliveryId : id,
      },
    });
    const database = transaction ?? this.prisma;
    await database.$executeRaw`
      INSERT INTO notification_delivery_outbox(id, topic, message_key, payload)
      VALUES (${id}::uuid, ${pattern}, ${envelope.key}, ${payload}::jsonb)`;
  }

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.drain().catch(() =>
        this.outboxLogger.warn(
          'Notification outbox is temporarily unavailable',
        ),
      );
    }, NOTIFICATION_OUTBOX.pollIntervalMs);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.close();
  }

  async drain(): Promise<void> {
    if (this.stopped || this.draining) return;
    this.draining = true;
    const lease = randomUUID();
    try {
      const rows = await this.prisma.$queryRaw<DeliveryRow[]>`
        UPDATE notification_delivery_outbox
        SET lease_token=${lease}::uuid, lease_until=now()+make_interval(secs=>${NOTIFICATION_OUTBOX.leaseSeconds}),
          attempt_count=attempt_count+1
        WHERE id IN (
          SELECT id FROM notification_delivery_outbox
          WHERE status=${NOTIFICATION_OUTBOX.pending} AND next_attempt_at<=now()
            AND (lease_until IS NULL OR lease_until<now())
          ORDER BY next_attempt_at LIMIT ${NOTIFICATION_OUTBOX.batchSize}
          FOR UPDATE SKIP LOCKED
        ) RETURNING id,topic,message_key,payload`;
      await Promise.all(
        rows.map(async (row) => {
          try {
            await firstValueFrom(
              super
                .emit(row.topic, { key: row.message_key, value: row.payload })
                .pipe(timeout(NOTIFICATION_OUTBOX.sendTimeoutMs)),
            );
            await this.prisma.$executeRaw`
            UPDATE notification_delivery_outbox SET status=${NOTIFICATION_OUTBOX.published},
              published_at=now(),lease_token=NULL,lease_until=NULL
            WHERE id=${row.id}::uuid AND lease_token=${lease}::uuid`;
          } catch {
            await this.prisma.$executeRaw`
            UPDATE notification_delivery_outbox SET lease_token=NULL,lease_until=NULL,
              next_attempt_at=now()+make_interval(secs=>LEAST(${NOTIFICATION_OUTBOX.maxBackoffSeconds},
                power(2,LEAST(attempt_count,6))::int))
            WHERE id=${row.id}::uuid AND lease_token=${lease}::uuid`;
            this.outboxLogger.warn('Notification delivery retained for retry');
          }
        }),
      );
    } finally {
      this.draining = false;
    }
  }
}
