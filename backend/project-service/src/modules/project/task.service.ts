import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isTerminalTaskStatus, TaskStatus } from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectAccessService } from './project-access.service';
import { toTaskResponse } from './project.mapper';
import { ActivityService } from './activity.service';
import { NotificationEventService } from './notification-event.service';
import { assertTaskEditable } from './task-edit.guard';

const taskWithCount = {
  _count: { select: { children: true } },
  checklists: { orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }] },
  assignees: { orderBy: { assignedAt: 'asc' } },
  labelMappings: { include: { label: true }, orderBy: { labelId: 'asc' } },
} satisfies Prisma.TaskInclude;

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly activities: ActivityService,
    private readonly notifications: NotificationEventService,
  ) {}

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    await this.access.requireCanCreateTask(userId, projectId);
    const startDate = this.toDate(dto.startDate);
    const dueDate = this.toDate(dto.dueDate);
    this.validateDateRange(startDate, dueDate);
    const parentSprintId = await this.validateParent(projectId, dto.parentTaskId);

    const now = new Date();
    const status = dto.status ?? TaskStatus.TODO;
    const task = await this.prisma.task.create({
      data: {
        id: crypto.randomUUID(),
        projectId,
        parentTaskId: dto.parentTaskId,
        ...(parentSprintId !== undefined ? { sprintId: parentSprintId } : {}),
        title: dto.title.trim(),
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        status,
        createdBy: userId,
        reporterId: userId,
        startDate,
        dueDate,
        allDay: dto.allDay ?? false,
        completedAt: isTerminalTaskStatus(status) ? now : undefined,
        completedBy: isTerminalTaskStatus(status) ? userId : undefined,
        estimatedMinutes: dto.estimatedMinutes ?? 0,
        rank: dto.rank,
        archived: false,
        isParentTask: dto.isParentTask ?? false,
        autoCompleteSprint: dto.autoCompleteSprint ?? false,
        createdAt: now,
        updatedAt: now,
      },
      include: taskWithCount,
    });

    await this.activities.record(task.id, userId, 'created', null, task.title);

    return toTaskResponse(task);
  }

  async findAll(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const tasks = await this.prisma.task.findMany({
      where: { projectId, archived: false, deletedAt: null },
      orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
      include: taskWithCount,
    });
    return tasks.map(toTaskResponse);
  }

  async findOne(userId: string, taskId: string) {
    const task = await this.findTask(taskId);
    await this.access.requireReadAccess(userId, task.projectId);
    return toTaskResponse(task);
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto) {
    const current = await this.findTask(taskId);
    await this.access.requireCanEditTask(userId, current.projectId, current.createdBy);
    assertTaskEditable(current.status);

    if (dto.title !== undefined && !dto.title.trim()) {
      throw new BadRequestException('Task title cannot be empty');
    }
    if (dto.clearParent && dto.parentTaskId) {
      throw new ConflictException('A task cannot be assigned and unassigned at the same time');
    }

    const startDate = dto.startDate !== undefined ? this.toDate(dto.startDate) : current.startDate;
    const dueDate = dto.dueDate !== undefined ? this.toDate(dto.dueDate) : current.dueDate;
    this.validateDateRange(startDate, dueDate);

    let parentTaskId: string | null | undefined;
    if (dto.clearParent) {
      parentTaskId = null;
    } else if (dto.parentTaskId !== undefined) {
      await this.validateParent(current.projectId, dto.parentTaskId, current.id);
      parentTaskId = dto.parentTaskId;
    }

    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.startDate !== undefined) data.startDate = startDate;
    if (dto.dueDate !== undefined) data.dueDate = dueDate;
    if (dto.allDay !== undefined) data.allDay = dto.allDay;
    if (dto.estimatedMinutes !== undefined) data.estimatedMinutes = dto.estimatedMinutes;
    if (dto.rank !== undefined) data.rank = dto.rank;
    if (dto.archived !== undefined) data.archived = dto.archived;
    if (dto.isParentTask !== undefined) data.isParentTask = dto.isParentTask;
    if (dto.autoCompleteSprint !== undefined) data.autoCompleteSprint = dto.autoCompleteSprint;
    if (parentTaskId !== undefined) {
      data.parent = parentTaskId === null
        ? { disconnect: true }
        : { connect: { id: parentTaskId } };
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
      data.completedAt = isTerminalTaskStatus(dto.status) ? new Date() : null;
      data.completedBy = isTerminalTaskStatus(dto.status) ? userId : null;
    }

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data,
      include: taskWithCount,
    });

    await this.recordChanges(current, dto, userId, task.id);

    if (dto.assigneeUserId !== undefined) {
      if (dto.assigneeUserId === null) {
        await this.prisma.taskAssignee.deleteMany({ where: { taskId } });
      } else {
        const member = await this.prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId: current.projectId, userId: dto.assigneeUserId } },
          select: { status: true },
        });
        if (!member || member.status !== 'ACTIVE') {
          throw new BadRequestException('Assignee must be an active project member');
        }
        await this.prisma.taskAssignee.deleteMany({ where: { taskId } });
        await this.prisma.taskAssignee.create({
          data: { id: crypto.randomUUID(), taskId, projectId: current.projectId, userId: dto.assigneeUserId, assignedAt: new Date() },
        });
        void this.notifications.send({
          recipientId: dto.assigneeUserId,
          senderId: userId,
          type: 'PROJECT_TASK_ASSIGNED',
          title: 'You were assigned a task',
          content: `Task "${current.title}" was assigned to you.`,
          link: `/projects/${current.projectId}`,
          metadata: { taskId: current.id, projectId: current.projectId },
        });
      }
      return toTaskResponse(await this.findTask(task.id));
    }
    if (dto.status !== undefined || dto.title !== undefined || dto.dueDate !== undefined) {
      for (const assignee of current.assignees) {
        if (assignee.userId === userId) continue;
        void this.notifications.send({
          recipientId: assignee.userId,
          senderId: userId,
          type: 'PROJECT_TASK_UPDATED',
          title: 'Task updated',
          content: `Task "${task.title}" was just updated.`,
          link: `/projects/${current.projectId}`,
          metadata: { taskId: current.id, projectId: current.projectId },
        });
      }
    }
    return toTaskResponse(task);
  }

  async delete(userId: string, taskId: string): Promise<void> {
    const task = await this.findTask(taskId);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    assertTaskEditable(task.status);
    await this.prisma.task.update({
      where: { id: taskId },
      data: { archived: true, deletedAt: new Date() },
    });
    await this.activities.record(taskId, userId, 'archived', false, true);
  }

  private async findTask(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: taskWithCount,
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async validateParent(projectId: string, parentTaskId?: string, currentTaskId?: string): Promise<string | null | undefined> {
    if (!parentTaskId) return undefined;
    if (parentTaskId === currentTaskId) throw new ConflictException('A task cannot be its own parent');

    const parent = await this.prisma.task.findFirst({
      where: { id: parentTaskId, projectId, deletedAt: null },
      select: { archived: true, parentTaskId: true, sprintId: true, status: true },
    });
    if (!parent) throw new NotFoundException('Parent task not found in this project');
    if (parent.archived) throw new ConflictException('An archived task cannot be a parent');
    assertTaskEditable(parent.status);
    if (parent.parentTaskId) throw new ConflictException('Only top-level tasks can be parents');
    return parent.sprintId;
  }

  private toDate(value?: string): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }

  private validateDateRange(startDate?: Date | null, dueDate?: Date | null): void {
    if (startDate && dueDate && startDate > dueDate) {
      throw new ConflictException('Start date cannot be after due date');
    }
  }

  private async recordChanges(
    current: Prisma.TaskGetPayload<{ include: typeof taskWithCount }>,
    dto: UpdateTaskDto,
    actorId: string,
    taskId: string,
  ) {
    const changes: Array<[string, unknown, unknown]> = [];
    if (dto.title !== undefined) changes.push(['title', current.title, dto.title.trim()]);
    if (dto.description !== undefined) changes.push(['description', current.description, dto.description]);
    if (dto.priority !== undefined) changes.push(['priority', current.priority, dto.priority]);
    if (dto.status !== undefined) changes.push(['status', current.status, dto.status]);
    if (dto.startDate !== undefined) changes.push(['startDate', current.startDate?.toISOString(), dto.startDate]);
    if (dto.dueDate !== undefined) changes.push(['dueDate', current.dueDate?.toISOString(), dto.dueDate]);
    if (dto.estimatedMinutes !== undefined) changes.push(['estimatedMinutes', current.estimatedMinutes, dto.estimatedMinutes]);
    if (dto.allDay !== undefined) changes.push(['allDay', current.allDay, dto.allDay]);
    if (dto.rank !== undefined) changes.push(['rank', current.rank, dto.rank]);
    if (dto.archived !== undefined) changes.push(['archived', current.archived, dto.archived]);
    if (dto.parentTaskId !== undefined || dto.clearParent) changes.push(['parentTaskId', current.parentTaskId, dto.clearParent ? null : dto.parentTaskId]);
    if (dto.isParentTask !== undefined) changes.push(['isParentTask', current.isParentTask, dto.isParentTask]);
    if (dto.autoCompleteSprint !== undefined) changes.push(['autoCompleteSprint', current.autoCompleteSprint, dto.autoCompleteSprint]);
    if (dto.assigneeUserId !== undefined) changes.push(['assigneeUserId', current.assignees[0]?.userId, dto.assigneeUserId]);
    await Promise.all(changes.map(([field, oldValue, newValue]) => this.activities.record(taskId, actorId, field, oldValue, newValue)));
  }
}
