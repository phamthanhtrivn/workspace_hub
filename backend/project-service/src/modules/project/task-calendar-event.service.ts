import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { Prisma } from "@prisma/client";
import { lastValueFrom } from "rxjs";
import { PROJECT_KAFKA_CLIENT } from "../../infrastructure/kafka/project-kafka.module";
import { PrismaService } from "../../common/prisma/prisma.service";

const TASK_TOPIC = "project-task-events";

@Injectable()
export class TaskCalendarEventService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskCalendarEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROJECT_KAFKA_CLIENT) private readonly kafka: ClientKafka,
  ) {}

  async onApplicationBootstrap() {
    void this.reconcileScheduledTasks().catch((error: unknown) => {
      this.logger.error(
        "Project task calendar reconciliation failed",
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  async publishUpsert(
    taskId: string,
    database: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await database.$executeRaw`
      INSERT INTO notification_outbox
        (id, event_type, payload, status, attempt_count, next_attempt_at, created_at)
      VALUES (${crypto.randomUUID()}::uuid, 'PROJECT_TASK_CALENDAR',
        ${JSON.stringify({ taskId })}::jsonb, 'PENDING', 0, NOW(), NOW())
    `;
  }

  async deliverUpsert(taskId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            ownerId: true,
            members: {
              where: { status: "ACTIVE" },
              select: { userId: true },
            },
          },
        },
      },
    });
    if (!task) return;

    const activeMemberIds = new Set(
      task.project.members.map((member) => member.userId),
    );
    activeMemberIds.add(task.project.ownerId);
    const recipientUserIds = [...activeMemberIds];
    const hasSchedule = Boolean(task.startDate || task.dueDate);
    const eventType =
      !hasSchedule || task.archived || task.deletedAt
        ? "PROJECT_TASK_CALENDAR_REMOVED"
        : "PROJECT_TASK_CALENDAR_UPSERTED";

    await lastValueFrom(
      this.kafka.emit(TASK_TOPIC, {
        eventType,
        occurredAt: new Date().toISOString(),
        task: {
          id: task.id,
          projectId: task.projectId,
          projectName: task.project.name,
          projectColor: task.project.color,
          title: task.title,
          description: task.description,
          startAt: task.startDate?.toISOString() ?? null,
          endAt: task.dueDate?.toISOString() ?? null,
          allDay: task.allDay,
          createdBy: task.createdBy,
          recipientUserIds,
        },
      }),
    );
    this.logger.debug(`Published calendar snapshot for task ${task.id}`);
  }

  async publishProject(
    projectId: string,
    database: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await database.$executeRaw`
      INSERT INTO notification_outbox
        (id, event_type, payload, status, attempt_count, next_attempt_at, created_at)
      SELECT gen_random_uuid(), 'PROJECT_TASK_CALENDAR',
        jsonb_build_object('taskId', id), 'PENDING', 0, NOW(), NOW()
      FROM tasks WHERE project_id = ${projectId}::uuid
    `;
  }

  private async reconcileScheduledTasks(): Promise<void> {
    const batchSize = 100;
    let cursor: string | undefined;
    let published = 0;
    let shouldContinue = true;

    while (shouldContinue) {
      const tasks = await this.prisma.task.findMany({
        select: { id: true },
        orderBy: { id: "asc" },
        take: batchSize,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (tasks.length === 0) break;

      await this.publishTaskIds(tasks.map((task) => task.id));
      published += tasks.length;
      cursor = tasks[tasks.length - 1].id;
      shouldContinue = tasks.length === batchSize;
    }

    this.logger.log(`Reconciled ${published} scheduled tasks to Calendar`);
  }

  private async publishTaskIds(taskIds: string[]): Promise<void> {
    const concurrency = 20;
    for (let offset = 0; offset < taskIds.length; offset += concurrency) {
      await Promise.all(
        taskIds
          .slice(offset, offset + concurrency)
          .map((taskId) => this.publishUpsert(taskId)),
      );
    }
  }
}
