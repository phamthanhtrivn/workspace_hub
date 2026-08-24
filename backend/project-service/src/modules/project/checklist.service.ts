import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ActivityService } from './activity.service';
import { assertTaskEditable } from './task-edit.guard';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly activities: ActivityService,
  ) {}

  async create(userId: string, taskId: string, dto: CreateChecklistDto) {
    const task = await this.getTask(taskId);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    assertTaskEditable(task.status);
    const item = await this.prisma.taskChecklist.create({
      data: {
        id: crypto.randomUUID(),
        taskId,
        title: dto.title.trim(),
        createdAt: new Date(),
        rank: String(Date.now()),
      },
    });
    await this.activities.record(taskId, userId, 'checklist_created', null, { title: item.title });
    return item;
  }

  async update(userId: string, checklistId: string, dto: UpdateChecklistDto) {
    const item = await this.getChecklist(checklistId);
    const task = await this.getTask(item.taskId);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    assertTaskEditable(task.status);
    const updated = await this.prisma.taskChecklist.update({
      where: { id: checklistId },
      data: { completed: dto.completed, completedBy: dto.completed ? userId : null },
    });
    await this.activities.record(
      item.taskId,
      userId,
      'checklist_completed',
      { title: item.title, completed: item.completed },
      { title: updated.title, completed: updated.completed },
    );
    return updated;
  }

  async remove(userId: string, checklistId: string) {
    const item = await this.getChecklist(checklistId);
    const task = await this.getTask(item.taskId);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    assertTaskEditable(task.status);
    await this.prisma.taskChecklist.delete({ where: { id: checklistId } });
    await this.activities.record(item.taskId, userId, 'checklist_deleted', { title: item.title }, null);
    return { id: checklistId };
  }

  private async getChecklist(id: string) {
    const item = await this.prisma.taskChecklist.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Checklist item not found');
    return item;
  }

  private async getTask(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, select: { projectId: true, createdBy: true, status: true } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
