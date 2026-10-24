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
} from "./task-sync.types";

@Injectable()
export class TaskSyncOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TaskSyncOutboxService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private stopped = false;
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
  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
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
      const records = await this.prisma.taskSyncOutbox.findMany({
        where: { deliveredAt: null, nextAttemptAt: { lte: new Date() } },
        take: this.config.outboxBatchSize,
        orderBy: [{ nextAttemptAt: "asc" }, { version: "asc" }],
      });
      for (const record of records) {
        try {
          await firstValueFrom(
            this.kafka
              .emit(KAFKA_TOPICS.PROJECT_TASK_SYNC, {
                key: record.taskId,
                value: record.payload,
              })
              .pipe(timeout(TASK_SYNC_SEND_TIMEOUT_MS)),
          );
          await this.prisma.taskSyncOutbox.update({
            where: { id: record.id },
            data: { deliveredAt: new Date() },
          });
        } catch (error) {
          this.logger.warn(
            `Task sync delivery failed for ${record.taskId}: ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          await this.prisma.taskSyncOutbox.update({
            where: { id: record.id },
            data: {
              attemptCount: { increment: 1 },
              nextAttemptAt: new Date(
                Date.now() +
                  Math.min(
                    TASK_SYNC_RETRY_MAX_MS,
                    this.config.outboxPollIntervalMs *
                      2 ** Math.min(record.attemptCount, 10),
                  ),
              ),
            },
          });
        }
      }
    } finally {
      this.running = false;
    }
  }
}
