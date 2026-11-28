import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TaskPolicyService } from '../task/task-policy.service';
import { paginate, PaginationQueryDto } from '../../common/utils/pagination';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { toActivityResponse } from '../project/project.mapper';
import { TaskActivityNotificationService } from './task-activity-notification.service';

type ActivityDatabase = PrismaService | Prisma.TransactionClient;
export type ActivityChange = [field: string, oldValue: unknown, newValue: unknown];

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskPolicy: TaskPolicyService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly notifications: TaskActivityNotificationService,
  ) {}

  async list(userId: string, taskId: string, query: PaginationQueryDto) {
    await this.taskPolicy.requireReadable(userId, taskId);
    const [total, activities] = await this.prisma.$transaction([
      this.prisma.taskActivity.count({ where: { taskId } }),
      this.prisma.taskActivity.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);

    const actorIds = activities
      .map((a) => a.actorId)
      .filter((id): id is string => Boolean(id));
    const profiles = await this.userProfiles.getProfilesByUserIds(actorIds);

    return paginate(
      activities.map((activity) =>
        toActivityResponse(
          activity,
          activity.actorId ? profiles.get(activity.actorId) : null,
        ),
      ),
      total,
      query,
    );
  }

  async record(
    taskId: string,
    actorId: string | null,
    field: string,
    oldValue?: unknown,
    newValue?: unknown,
    database: ActivityDatabase = this.prisma,
  ) {
    const serializedOldValue = this.stringify(oldValue);
    const serializedNewValue = this.stringify(newValue);
    if (serializedOldValue === serializedNewValue) return;
    const activity = await database.taskActivity.create({
      data: {
        id: crypto.randomUUID(),
        taskId,
        actorId,
        field,
        oldValue: serializedOldValue,
        newValue: serializedNewValue,
        createdAt: new Date(),
      },
    });
    await this.notifications.notify(taskId, actorId, [[field, oldValue, newValue]], database);
    return activity;
  }

  async recordMany(
    taskId: string,
    actorId: string | null,
    changes: ActivityChange[],
    database: ActivityDatabase = this.prisma,
  ): Promise<void> {
    const changed = changes.filter(([, before, after]) => this.stringify(before) !== this.stringify(after));
    if (!changed.length) return;
    await database.taskActivity.createMany({ data: changed.map(([field, oldValue, newValue]) => ({
      id: crypto.randomUUID(), taskId, actorId, field,
      oldValue: this.stringify(oldValue), newValue: this.stringify(newValue), createdAt: new Date(),
    })) });
    await this.notifications.notify(taskId, actorId, changed, database);
  }

  private stringify(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
}
