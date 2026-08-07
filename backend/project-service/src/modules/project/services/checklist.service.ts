import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { CreateChecklistDto } from '../dto/create-checklist.dto';
import { UpdateChecklistDto } from '../dto/update-checklist.dto';
import { ProjectGateway } from '../events/project.gateway';
import { ProjectRealtimeAction, ProjectRealtimeResource } from '../events/project.events';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: ProjectGateway,
  ) {}

  async create(userId: string, taskId: string, dto: CreateChecklistDto) {
    const task = await this.getTask(taskId);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    const item = await this.prisma.taskChecklist.create({
      data: {
        id: crypto.randomUUID(),
        taskId,
        title: dto.title.trim(),
        createdAt: new Date(),
        rank: String(Date.now()),
      },
    });
    this.realtime.emitDataChanged(task.projectId, ProjectRealtimeResource.CHECKLIST, ProjectRealtimeAction.CREATED, userId, item);
    return item;
  }

  async update(userId: string, checklistId: string, dto: UpdateChecklistDto) {
    const item = await this.getChecklist(checklistId);
    const task = await this.getTask(item.taskId);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    const updated = await this.prisma.taskChecklist.update({
      where: { id: checklistId },
      data: { completed: dto.completed, completedBy: dto.completed ? userId : null },
    });
    this.realtime.emitDataChanged(task.projectId, ProjectRealtimeResource.CHECKLIST, ProjectRealtimeAction.UPDATED, userId, updated);
    return updated;
  }

  async remove(userId: string, checklistId: string) {
    const item = await this.getChecklist(checklistId);
    const task = await this.getTask(item.taskId);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    await this.prisma.taskChecklist.delete({ where: { id: checklistId } });
    this.realtime.emitDataChanged(task.projectId, ProjectRealtimeResource.CHECKLIST, ProjectRealtimeAction.DELETED, userId, { id: checklistId });
    return { id: checklistId };
  }

  private async getChecklist(id: string) {
    const item = await this.prisma.taskChecklist.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Checklist item not found');
    return item;
  }

  private async getTask(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id }, select: { projectId: true, createdBy: true } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
