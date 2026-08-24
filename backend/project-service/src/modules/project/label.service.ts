import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { ActivityService } from './activity.service';
import { isUniqueConstraintError } from '../../common/prisma/prisma-errors';
import { TaskPolicyService } from './task-policy.service';

@Injectable()
export class LabelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly activities: ActivityService,
    private readonly taskPolicy: TaskPolicyService,
  ) {}

  async list(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    return this.prisma.taskLabel.findMany({ where: { projectId }, orderBy: { name: 'asc' } });
  }

  async create(userId: string, projectId: string, dto: CreateLabelDto) {
    await this.access.requireManager(userId, projectId);
    try {
      return await this.prisma.taskLabel.create({
        data: { id: crypto.randomUUID(), projectId, name: dto.name.trim(), color: dto.color || '#0052CC' },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A label with this name already exists');
      }
      throw error;
    }
  }

  async update(userId: string, labelId: string, dto: UpdateLabelDto) {
    const label = await this.getLabel(labelId);
    await this.access.requireManager(userId, label.projectId);
    try {
      return await this.prisma.taskLabel.update({ where: { id: labelId }, data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      } });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('A label with this name already exists');
      }
      throw error;
    }
  }

  async remove(userId: string, labelId: string) {
    const label = await this.getLabel(labelId);
    await this.access.requireManager(userId, label.projectId);
    await this.prisma.taskLabel.delete({ where: { id: labelId } });
    return { id: labelId };
  }

  async attach(userId: string, taskId: string, labelId: string) {
    const task = await this.taskPolicy.requireEditable(userId, taskId);
    const label = await this.getLabel(labelId);
    if (label.projectId !== task.projectId) throw new ConflictException('Label does not belong to this project');
    const existing = await this.prisma.taskLabelMapping.findFirst({ where: { taskId, labelId, projectId: task.projectId } });
    if (!existing) {
      await this.prisma.$transaction(async (tx) => {
        await tx.taskLabelMapping.create({
          data: { id: crypto.randomUUID(), taskId, labelId, projectId: task.projectId },
        });
        await this.activities.record(taskId, userId, 'label_attached', null, label.name, tx);
      });
    }
    return label;
  }

  async detach(userId: string, taskId: string, labelId: string) {
    const task = await this.taskPolicy.requireEditable(userId, taskId);
    const label = await this.getLabel(labelId);
    if (label.projectId !== task.projectId) throw new ConflictException('Label does not belong to this project');
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.taskLabelMapping.deleteMany({
        where: { taskId, labelId, projectId: task.projectId },
      });
      if (deleted.count > 0) {
        await this.activities.record(taskId, userId, 'label_detached', label.name, null, tx);
      }
    });
    return { taskId, labelId };
  }

  private async getLabel(id: string) {
    const label = await this.prisma.taskLabel.findUnique({ where: { id } });
    if (!label) throw new NotFoundException('Label not found');
    return label;
  }
}
