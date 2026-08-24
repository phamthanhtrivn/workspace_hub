import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TaskPolicyService } from './task-policy.service';

type ActivityDatabase = PrismaService | Prisma.TransactionClient;
export type ActivityChange = [field: string, oldValue: unknown, newValue: unknown];

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskPolicy: TaskPolicyService,
  ) {}

  async list(userId: string, taskId: string) {
    await this.taskPolicy.requireReadable(userId, taskId);
    return this.prisma.taskActivity.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
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
    return database.taskActivity.create({
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
  }

  async recordMany(
    taskId: string,
    actorId: string | null,
    changes: ActivityChange[],
    database: ActivityDatabase = this.prisma,
  ): Promise<void> {
    await Promise.all(
      changes.map(([field, oldValue, newValue]) =>
        this.record(taskId, actorId, field, oldValue, newValue, database),
      ),
    );
  }

  private stringify(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
}
