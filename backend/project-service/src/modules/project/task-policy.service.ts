import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { assertTaskEditable } from './task-edit.guard';

@Injectable()
export class TaskPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
  ) {}

  async findActive(taskId: string, notFoundMessage = 'Task not found') {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, projectId: true, createdBy: true, status: true },
    });
    if (!task) throw new NotFoundException(notFoundMessage);
    return task;
  }

  async requireReadable(userId: string, taskId: string) {
    const task = await this.findActive(taskId);
    await this.access.requireReadAccess(userId, task.projectId);
    return task;
  }

  async requireEditable(userId: string, taskId: string, notFoundMessage = 'Task not found') {
    const task = await this.findActive(taskId, notFoundMessage);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    assertTaskEditable(task.status);
    return task;
  }
}
