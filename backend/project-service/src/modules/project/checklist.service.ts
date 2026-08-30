import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateChecklistDto } from './dto/create-checklist.dto';
import { UpdateChecklistDto } from './dto/update-checklist.dto';
import { ActivityService } from './activity.service';
import { TaskPolicyService } from './task-policy.service';

@Injectable()
export class ChecklistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivityService,
    private readonly taskPolicy: TaskPolicyService,
  ) {}

  async create(userId: string, taskId: string, dto: CreateChecklistDto) {
    await this.taskPolicy.requireEditable(userId, taskId);
    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.taskChecklist.create({
        data: {
          id: crypto.randomUUID(),
          taskId,
          title: dto.title.trim(),
          createdAt: new Date(),
          rank: `${Date.now()}-${crypto.randomUUID()}`,
        },
      });
      await this.activities.record(taskId, userId, 'checklist_created', null, { title: created.title }, tx);
      return created;
    });
    return item;
  }

  async update(userId: string, checklistId: string, dto: UpdateChecklistDto) {
    const item = await this.getChecklist(checklistId);
    await this.taskPolicy.requireEditable(userId, item.taskId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.taskChecklist.update({
        where: { id: checklistId },
        data: { completed: dto.completed, completedBy: dto.completed ? userId : null },
      });
      await this.activities.record(
        item.taskId,
        userId,
        'checklist_completed',
        { title: item.title, completed: item.completed },
        { title: result.title, completed: result.completed },
        tx,
      );
      return result;
    });
    return updated;
  }

  async remove(userId: string, checklistId: string) {
    const item = await this.getChecklist(checklistId);
    await this.taskPolicy.requireEditable(userId, item.taskId);
    await this.prisma.$transaction(async (tx) => {
      await tx.taskChecklist.delete({ where: { id: checklistId } });
      await this.activities.record(item.taskId, userId, 'checklist_deleted', { title: item.title }, null, tx);
    });
    return { id: checklistId };
  }

  private async getChecklist(id: string) {
    const item = await this.prisma.taskChecklist.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Checklist item not found');
    return item;
  }

}
