import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { firstValueFrom, timeout } from "rxjs";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../../common/prisma/prisma.service";
import { RuntimeConfigService } from "../../common/config/runtime-config.service";
import { PROJECT_KAFKA_CLIENT } from "../../infrastructure/kafka/project-kafka.module";
import { KAFKA_TOPICS } from "../../common/constants/kafka.constants";
import {
  SyncableTask,
  taskSyncEvent,
  TASK_SYNC_BATCH_SIZE,
  TASK_SYNC_RETRY_MAX_MS,
  TASK_SYNC_SEND_TIMEOUT_MS,
  TASK_SYNC_LEASE_MS,
  ClaimedTaskSync,
} from "./task-sync.types";

@Injectable()
export class TaskSyncOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskSyncOutboxService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private stopped = false;
  private activeDelivery?: Promise<void>;
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROJECT_KAFKA_CLIENT) private readonly kafka: ClientKafka,
    private readonly config: RuntimeConfigService,
  ) {}

  async enqueue(
    task: SyncableTask,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const payload = taskSyncEvent(task);
    await tx.taskSyncOutbox.upsert({
      where: { taskId_version: { taskId: task.id, version: task.version } },
      create: {
        taskId: task.id,
        version: task.version,
        payload: { ...payload },
      },
      update: {},
    });
  }

  onModuleInit(): void {
    // Reconcile existing cards too; each task version is queued only once.
    void this.reconcileExistingTasks().catch((error: unknown) =>
      this.logger.error(error),
    );
    this.timer = setInterval(() => {
      void this.drain().catch((error: unknown) => this.logger.error(error));
    }, this.config.outboxPollIntervalMs);
    this.timer.unref();
  }
  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    await this.activeDelivery;
  }

  async reconcileExistingTasks(): Promise<void> {
    let cursor: string | undefined;
    while (!this.stopped) {
      const tasks = await this.prisma.task.findMany({
        take: TASK_SYNC_BATCH_SIZE,
        orderBy: { id: "asc" },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!tasks.length) return;
      await this.prisma.taskSyncOutbox.createMany({
        data: tasks.map((task) => ({
          taskId: task.id,
          version: task.version,
          payload: { ...taskSyncEvent(task) },
        })),
        skipDuplicates: true,
      });
      cursor = tasks[tasks.length - 1].id;
    }
  }

  async drain(): Promise<void> {
    if (this.running || this.stopped) return;
    this.running = true;
    try {
      // Claim immediately before each delivery; a slow earlier send cannot
      // consume another record's lease while it waits in a local batch.
      for (let index = 0; index < this.config.outboxBatchSize && !this.stopped; index++) {
        const record = await this.claimOne();
        if (!record) break;
        this.activeDelivery = this.deliver(record);
        await this.activeDelivery;
        this.activeDelivery = undefined;
      }
    } finally {
      this.running = false;
    }
  }

  private async claimOne(): Promise<ClaimedTaskSync | undefined> {
    const token = randomUUID();
    const records = await this.prisma.$queryRaw<ClaimedTaskSync[]>`
      WITH candidate AS (
        SELECT e.id FROM task_sync_outbox e
        WHERE e.delivered_at IS NULL AND e.next_attempt_at <= NOW()
          AND (e.lease_until IS NULL OR e.lease_until <= NOW())
          AND NOT EXISTS (
            SELECT 1 FROM task_sync_outbox older
            WHERE older.task_id = e.task_id AND older.version < e.version
              AND older.delivered_at IS NULL
          )
        ORDER BY e.next_attempt_at, e.version, e.id
        LIMIT 1 FOR UPDATE OF e SKIP LOCKED
      )
      UPDATE task_sync_outbox e SET lease_token = ${token}::uuid,
        lease_until = NOW() + (${TASK_SYNC_LEASE_MS} * INTERVAL '1 millisecond')
      FROM candidate c WHERE e.id = c.id
      RETURNING e.id, e.task_id AS "taskId", e.payload,
        e.attempt_count AS "attemptCount", e.lease_token AS "leaseToken"
    `;
    return records[0];
  }

  private async deliver(record: ClaimedTaskSync): Promise<void> {
    try {
      await firstValueFrom(this.kafka.emit(KAFKA_TOPICS.PROJECT_TASK_SYNC, {
        key: record.taskId, value: record.payload,
      }).pipe(timeout(TASK_SYNC_SEND_TIMEOUT_MS)));
      await this.prisma.$executeRaw`
        UPDATE task_sync_outbox SET delivered_at = NOW(), lease_token = NULL, lease_until = NULL
        WHERE id = ${record.id}::uuid AND lease_token = ${record.leaseToken}::uuid
          AND lease_until > NOW() AND delivered_at IS NULL
      `;
    } catch {
      const nextAttemptAt = new Date(Date.now() + Math.min(TASK_SYNC_RETRY_MAX_MS,
        this.config.outboxPollIntervalMs * 2 ** Math.min(record.attemptCount, 10)));
      await this.prisma.$executeRaw`
        UPDATE task_sync_outbox SET attempt_count = attempt_count + 1, next_attempt_at = ${nextAttemptAt},
          lease_token = NULL, lease_until = NULL
        WHERE id = ${record.id}::uuid AND lease_token = ${record.leaseToken}::uuid
          AND lease_until > NOW() AND delivered_at IS NULL
      `;
      this.logger.warn(`Task sync delivery will retry for ${record.taskId}`);
    }
  }
}
