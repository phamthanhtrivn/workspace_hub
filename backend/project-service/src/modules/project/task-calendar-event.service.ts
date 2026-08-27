import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import {
  PROJECT_KAFKA_CLIENT,
} from '../../infrastructure/kafka/project-kafka.module';
import { PrismaService } from '../../common/prisma/prisma.service';

const TASK_TOPIC = 'project-task-events';

@Injectable()
export class TaskCalendarEventService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskCalendarEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PROJECT_KAFKA_CLIENT) private readonly kafka: ClientKafka,
  ) {}

  async onApplicationBootstrap() {
    await this.kafka.connect();
  }

  async publishUpsert(taskId: string): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { select: { userId: true } },
        project: {
          select: {
            id: true,
            name: true,
            color: true,
            ownerId: true,
            members: {
              where: { status: 'ACTIVE' },
              select: { userId: true },
            },
          },
        },
      },
    });
    if (!task) return;

    const recipientUserIds = [
      ...new Set([
        task.createdBy,
        task.project.ownerId,
        ...task.assignees.map((assignee) => assignee.userId),
        ...task.project.members.map((member) => member.userId),
      ]),
    ];
    const hasSchedule = Boolean(task.startDate || task.dueDate);
    const eventType =
      !hasSchedule || task.archived || task.deletedAt
        ? 'PROJECT_TASK_CALENDAR_REMOVED'
        : 'PROJECT_TASK_CALENDAR_UPSERTED';

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
}
