import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async list(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) throw new NotFoundException('Task not found');
    await this.access.requireReadAccess(userId, task.projectId);
    return this.prisma.taskActivity.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async record(taskId: string, actorId: string | null, field: string, oldValue?: unknown, newValue?: unknown) {
    if (oldValue === newValue) return;
    return this.prisma.taskActivity.create({
      data: {
        id: crypto.randomUUID(),
        taskId,
        actorId,
        field,
        oldValue: this.stringify(oldValue),
        newValue: this.stringify(newValue),
        createdAt: new Date(),
      },
    });
  }

  private stringify(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
}
