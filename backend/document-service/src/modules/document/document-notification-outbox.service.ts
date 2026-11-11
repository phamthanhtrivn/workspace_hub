import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Kafka, Producer } from 'kafkajs';
import { PrismaService } from '../../prisma/prisma.service';
import { KAFKA_CONFIG } from '../../infrastructure/kafka/kafka.constants';
import { DOCUMENT_NOTIFICATION } from './document-share-notification.service';

@Injectable()
export class DocumentNotificationOutboxService implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentNotificationOutboxService.name);
  private producer?: Producer;
  private running = false;
  private connecting?: Promise<void>;
  constructor(private readonly prisma: PrismaService) {}

  @Interval(DOCUMENT_NOTIFICATION.POLL_MS)
  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      const lease = crypto.randomUUID();
      const jobs = await this.prisma.$queryRaw<
        Array<{
          id: string;
          payload: Record<string, unknown>;
          attempts: number;
        }>
      >`
        WITH ready AS (
          SELECT id FROM document_notification_outbox
          WHERE next_attempt_at <= NOW() AND (locked_at IS NULL OR locked_at < ${new Date(Date.now() - DOCUMENT_NOTIFICATION.LEASE_MS)})
          ORDER BY created_at LIMIT ${DOCUMENT_NOTIFICATION.BATCH_SIZE} FOR UPDATE SKIP LOCKED
        ) UPDATE document_notification_outbox AS jobs SET locked_at = NOW(), lease_token = ${lease}::uuid
          FROM ready WHERE jobs.id = ready.id RETURNING jobs.id, jobs.payload, jobs.attempts`;
      for (const job of jobs) {
        try {
          if (!this.producer)
            this.producer = new Kafka({
              clientId: 'document-notification-producer',
              brokers: (
                process.env[KAFKA_CONFIG.BROKER_ENV] ||
                KAFKA_CONFIG.DEFAULT_BROKER
              )
                .split(',')
                .map((broker) => broker.trim()),
            }).producer();
          this.connecting ??= this.producer
            .connect()
            .catch((error: unknown) => {
              this.connecting = undefined;
              throw error;
            });
          await this.connecting;
          await this.producer.send({
            topic: DOCUMENT_NOTIFICATION.TOPIC,
            messages: [
              {
                key: String(job.payload.recipientId),
                value: JSON.stringify(job.payload),
              },
            ],
          });
          await this.prisma
            .$executeRaw`DELETE FROM document_notification_outbox WHERE id = ${job.id}::uuid AND lease_token = ${lease}::uuid`;
        } catch (error) {
          const next = new Date(
            Date.now() +
              Math.min(
                DOCUMENT_NOTIFICATION.POLL_MS * 2 ** Math.min(job.attempts, 10),
                DOCUMENT_NOTIFICATION.RETRY_MAX_MS,
              ),
          );
          await this.prisma
            .$executeRaw`UPDATE document_notification_outbox SET attempts = attempts + 1,
            next_attempt_at = ${next}, locked_at = NULL, lease_token = NULL
            WHERE id = ${job.id}::uuid AND lease_token = ${lease}::uuid`;
          this.logger.warn(
            `Document notification ${job.id} delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Document notification outbox unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      this.running = false;
    }
  }

  async onModuleDestroy() {
    await this.producer?.disconnect();
  }
}
