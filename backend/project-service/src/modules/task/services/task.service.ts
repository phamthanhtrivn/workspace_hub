import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isValidDateRange, parseOptionalDate } from '../../../common/utils/date.util';
import { TaskStatus } from '../../shared/project.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { ProjectAccessService } from '../../shared/project-access.service';
import { toTaskResponse } from '../../shared/project.mapper';
import { ActivityService } from './activity.service';
import { NotificationEventService } from '../../shared/notification-event.service';
import { ProjectGateway } from '../../realtime/project.gateway';
import {
  ProjectRealtimeAction,
  ProjectRealtimeEvent,
  ProjectRealtimeResource,
} from '../../realtime/project.events';

const taskWithCount = {
  _count: { select: { children: true } },
  checklists: { orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }] },
  assignees: { orderBy: { assignedAt: 'asc' } },
  labelMappings: { include: { label: true }, orderBy: { labelId: 'asc' } },
} satisfies Prisma.TaskInclude;

type CurrentTask = Prisma.TaskGetPayload<{
  include: typeof taskWithCount;
}>;

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly activities: ActivityService,
    private readonly notifications: NotificationEventService,
    private readonly realtime: ProjectGateway,
  ) {}

  async create(userId: string, projectId: string, dto: CreateTaskDto) {
    await this.access.requireCanCreateTask(userId, projectId);
    const startDate = parseOptionalDate(dto.startDate);
    const dueDate = parseOptionalDate(dto.dueDate);
    if (!isValidDateRange(startDate, dueDate)) {
      throw new ConflictException('Start date cannot be after due date');
    }
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
        completedAt: status === TaskStatus.DONE ? now : undefined,
        completedBy: status === TaskStatus.DONE ? userId : undefined,
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

    const response = toTaskResponse(task);
    this.realtime.emitToProject(projectId, ProjectRealtimeEvent.TASK_CREATED, {
      task: response,
      actorId: userId,
    });
    this.realtime.emitDataChanged(projectId, ProjectRealtimeResource.TASK, ProjectRealtimeAction.CREATED, userId, response);
    return response;
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

    if (dto.title !== undefined && !dto.title.trim()) {
      throw new BadRequestException('Task title cannot be empty');
    }
    if (dto.clearParent && dto.parentTaskId) {
      throw new ConflictException('A task cannot be assigned and unassigned at the same time');
    }

    const startDate = dto.startDate !== undefined ? parseOptionalDate(dto.startDate) : current.startDate;
    const dueDate = dto.dueDate !== undefined ? parseOptionalDate(dto.dueDate) : current.dueDate;
    if (!isValidDateRange(startDate, dueDate)) {
      throw new ConflictException('Start date cannot be after due date');
    }

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
      data.completedAt = dto.status === TaskStatus.DONE ? new Date() : null;
      data.completedBy = dto.status === TaskStatus.DONE ? userId : null;
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
          title: 'Bạn được giao một task',
          content: `Task “${current.title}” đã được giao cho bạn.`,
          link: `/projects/${current.projectId}`,
          metadata: { taskId: current.id, projectId: current.projectId },
        });
      }
      const response = toTaskResponse(await this.findTask(task.id));
      this.realtime.emitToProject(current.projectId, ProjectRealtimeEvent.TASK_UPDATED, {
        task: response,
        actorId: userId,
      });
      this.realtime.emitDataChanged(current.projectId, ProjectRealtimeResource.TASK, ProjectRealtimeAction.UPDATED, userId, response);
      return response;
    }
    if (dto.status !== undefined || dto.title !== undefined || dto.dueDate !== undefined) {
      for (const assignee of current.assignees) {
        if (assignee.userId === userId) continue;
        void this.notifications.send({
          recipientId: assignee.userId,
          senderId: userId,
          type: 'PROJECT_TASK_UPDATED',
          title: 'Task đã được cập nhật',
          content: `Task “${task.title}” vừa được cập nhật.`,
          link: `/projects/${current.projectId}`,
          metadata: { taskId: current.id, projectId: current.projectId },
        });
      }
    }
    const response = toTaskResponse(task);
    this.realtime.emitToProject(current.projectId, ProjectRealtimeEvent.TASK_UPDATED, {
      task: response,
      actorId: userId,
    });
    this.realtime.emitDataChanged(current.projectId, ProjectRealtimeResource.TASK, ProjectRealtimeAction.UPDATED, userId, response);
    return response;
  }

  async delete(userId: string, taskId: string): Promise<void> {
    const task = await this.findTask(taskId);
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    await this.prisma.task.update({
      where: { id: taskId },
      data: { archived: true, deletedAt: new Date() },
    });
    this.realtime.emitToProject(task.projectId, ProjectRealtimeEvent.TASK_DELETED, {
      taskId,
      actorId: userId,
    });
    this.realtime.emitDataChanged(task.projectId, ProjectRealtimeResource.TASK, ProjectRealtimeAction.DELETED, userId, { taskId });
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
      select: { archived: true, parentTaskId: true, sprintId: true },
    });
    if (!parent) throw new NotFoundException('Parent task not found in this project');
    if (parent.archived) throw new ConflictException('An archived task cannot be a parent');
    if (parent.parentTaskId) throw new ConflictException('Only top-level tasks can be parents');
    return parent.sprintId;
  }

  private async recordChanges(current: CurrentTask, dto: UpdateTaskDto, actorId: string, taskId: string) {
    const changes: Array<[string, unknown, unknown]> = [];
    if (dto.title !== undefined) changes.push(['title', current.title, dto.title.trim()]);
    if (dto.description !== undefined) changes.push(['description', current.description, dto.description]);
    if (dto.priority !== undefined) changes.push(['priority', current.priority, dto.priority]);
    if (dto.status !== undefined) changes.push(['status', current.status, dto.status]);
    if (dto.startDate !== undefined) changes.push(['startDate', current.startDate?.toISOString(), dto.startDate]);
    if (dto.dueDate !== undefined) changes.push(['dueDate', current.dueDate?.toISOString(), dto.dueDate]);
    if (dto.estimatedMinutes !== undefined) changes.push(['estimatedMinutes', current.estimatedMinutes, dto.estimatedMinutes]);
    if (dto.archived !== undefined) changes.push(['archived', current.archived, dto.archived]);
    if (dto.parentTaskId !== undefined || dto.clearParent) changes.push(['parentTaskId', current.parentTaskId, dto.clearParent ? null : dto.parentTaskId]);
    if (dto.assigneeUserId !== undefined) changes.push(['assigneeUserId', 'changed', dto.assigneeUserId]);
    await Promise.all(changes.map(([field, oldValue, newValue]) => this.activities.record(taskId, actorId, field, oldValue, newValue)));
  }
}
