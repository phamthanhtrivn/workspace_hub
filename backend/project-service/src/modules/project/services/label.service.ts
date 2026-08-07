import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { CreateLabelDto } from '../dto/create-label.dto';
import { UpdateLabelDto } from '../dto/update-label.dto';
import { ProjectGateway } from '../events/project.gateway';

@Injectable()
export class LabelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: ProjectGateway,
  ) {}

  async list(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    return this.prisma.taskLabel.findMany({ where: { projectId }, orderBy: { name: 'asc' } });
  }

  async create(userId: string, projectId: string, dto: CreateLabelDto) {
    await this.access.requireManager(userId, projectId);
    try {
      const label = await this.prisma.taskLabel.create({
        data: { id: crypto.randomUUID(), projectId, name: dto.name.trim(), color: dto.color || '#0052CC' },
      });
      this.realtime.emitDataChanged(projectId, 'label', 'created', userId, label);
      return label;
    } catch (error) {
      if (error instanceof Error && error.message.includes('uk_task_label_project_name')) {
        throw new ConflictException('A label with this name already exists');
      }
      throw error;
    }
  }

  async update(userId: string, labelId: string, dto: UpdateLabelDto) {
    const label = await this.getLabel(labelId);
    await this.access.requireManager(userId, label.projectId);
    const updated = await this.prisma.taskLabel.update({ where: { id: labelId }, data: {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.color !== undefined ? { color: dto.color } : {}),
    } });
    this.realtime.emitDataChanged(label.projectId, 'label', 'updated', userId, updated);
    return updated;
  }

  async remove(userId: string, labelId: string) {
    const label = await this.getLabel(labelId);
    await this.access.requireManager(userId, label.projectId);
    await this.prisma.taskLabel.delete({ where: { id: labelId } });
    this.realtime.emitDataChanged(label.projectId, 'label', 'deleted', userId, { id: labelId });
    return { id: labelId };
  }

  async attach(userId: string, taskId: string, labelId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true, createdBy: true } });
    if (!task) throw new NotFoundException('Task not found');
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    const label = await this.getLabel(labelId);
    if (label.projectId !== task.projectId) throw new ConflictException('Label does not belong to this project');
    const existing = await this.prisma.taskLabelMapping.findFirst({ where: { taskId, labelId, projectId: task.projectId } });
    if (!existing) {
      await this.prisma.taskLabelMapping.create({
        data: { id: crypto.randomUUID(), taskId, labelId, projectId: task.projectId },
      });
    }
    this.realtime.emitDataChanged(task.projectId, 'label_mapping', 'created', userId, { taskId, labelId });
    return label;
  }

  async detach(userId: string, taskId: string, labelId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, select: { projectId: true, createdBy: true } });
    if (!task) throw new NotFoundException('Task not found');
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    await this.prisma.taskLabelMapping.deleteMany({ where: { taskId, labelId } });
    this.realtime.emitDataChanged(task.projectId, 'label_mapping', 'deleted', userId, { taskId, labelId });
    return { taskId, labelId };
  }

  private async getLabel(id: string) {
    const label = await this.prisma.taskLabel.findUnique({ where: { id } });
    if (!label) throw new NotFoundException('Label not found');
    return label;
  }
}
