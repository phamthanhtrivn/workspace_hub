import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { ProjectType, SprintStatus, TaskStatus } from '../project.enums';
import { CreateSprintDto } from '../dto/create-sprint.dto';
import { AddSprintTasksDto } from '../dto/add-sprint-tasks.dto';
import { UpdateSprintDto } from '../dto/update-sprint.dto';
import { toTaskResponse } from '../mappers/project.mapper';
import { ProjectGateway } from '../events/project.gateway';

const sprintInclude = {
  tasks: {
    where: { archived: false, deletedAt: null },
    orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { children: true } } },
  },
} satisfies Prisma.SprintInclude;

@Injectable()
export class SprintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: ProjectGateway,
  ) {}

  async list(userId: string, projectId: string) {
    const project = await this.access.requireReadAccess(userId, projectId);
    this.assertSoftwareProject(project.projectType);
    const sprints = await this.prisma.sprint.findMany({
      where: { projectId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: sprintInclude,
    });
    return sprints.map((sprint) => this.toResponse(sprint));
  }

  async create(userId: string, projectId: string, dto: CreateSprintDto) {
    const project = await this.access.requireManager(userId, projectId);
    this.assertSoftwareProject(project.projectType);
    await this.validateDateRange(dto.startDate, dto.endDate);
    const now = new Date();
    const sprint = await this.prisma.sprint.create({
      data: {
        id: crypto.randomUUID(),
        projectId: project.id,
        name: dto.name.trim(),
        goal: dto.goal?.trim() || undefined,
        status: SprintStatus.PLANNED,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      },
      include: sprintInclude,
    });
    const response = this.toResponse(sprint);
    this.realtime.emitDataChanged(projectId, 'sprint', 'created', userId, response);
    return response;
  }

  async addTasks(userId: string, sprintId: string, dto: AddSprintTasksDto) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.PLANNED) {
      throw new ConflictException('Tasks can only be added to a planned sprint');
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: sprint.projectId,
        archived: false,
        deletedAt: null,
        id: { in: dto.taskIds },
      },
      select: { id: true, parentTaskId: true },
    });
    if (tasks.length !== dto.taskIds.length) {
      throw new NotFoundException('One or more tasks were not found in this project');
    }

    const selectedIds = tasks.map((task) => task.id);
    const childTasks = await this.prisma.task.findMany({
      where: { projectId: sprint.projectId, parentTaskId: { in: selectedIds }, archived: false, deletedAt: null },
      select: { id: true },
    });
    const allTaskIds = [...new Set([...selectedIds, ...childTasks.map((task) => task.id)])];
    await this.prisma.task.updateMany({
      where: { id: { in: allTaskIds } },
      data: { sprintId: sprint.id, updatedAt: new Date() },
    });
    const response = await this.getById(sprint.id);
    this.realtime.emitDataChanged(sprint.projectId, 'sprint', 'updated', userId, response);
    return response;
  }

  async removeTask(userId: string, sprintId: string, taskId: string) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.PLANNED) {
      throw new ConflictException('Tasks can only be moved back from a planned sprint');
    }

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId: sprint.projectId, sprintId: sprint.id, archived: false, deletedAt: null },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Task not found in this sprint');

    const childTasks = await this.prisma.task.findMany({
      where: { projectId: sprint.projectId, parentTaskId: task.id, sprintId: sprint.id, archived: false, deletedAt: null },
      select: { id: true },
    });
    await this.prisma.task.updateMany({
      where: { id: { in: [task.id, ...childTasks.map((child) => child.id)] } },
      data: { sprintId: null, updatedAt: new Date() },
    });
    const response = await this.getById(sprint.id);
    this.realtime.emitDataChanged(sprint.projectId, 'sprint', 'updated', userId, response);
    return response;
  }

  async start(userId: string, sprintId: string) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.PLANNED) {
      throw new ConflictException('Only a planned sprint can be started');
    }
    const activeSprint = await this.prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, status: SprintStatus.ACTIVE },
      select: { id: true },
    });
    if (activeSprint) throw new ConflictException('This project already has an active sprint');

    const now = new Date();
    const updated = await this.prisma.sprint.update({
      where: { id: sprint.id },
      data: { status: SprintStatus.ACTIVE, startedAt: now, updatedAt: now },
      include: sprintInclude,
    });
    const response = this.toResponse(updated);
    this.realtime.emitDataChanged(sprint.projectId, 'sprint', 'updated', userId, response);
    return response;
  }

  async update(userId: string, sprintId: string, dto: UpdateSprintDto) {
    const sprint = await this.getSprintForManager(userId, sprintId);

    const startDate = dto.startDate ? new Date(dto.startDate) : sprint.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : sprint.endDate;
    await this.validateDateRange(startDate?.toISOString(), endDate?.toISOString());

    const updated = await this.prisma.sprint.update({
      where: { id: sprint.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.goal !== undefined ? { goal: dto.goal.trim() || null } : {}),
        ...(dto.startDate !== undefined ? { startDate: new Date(dto.startDate) } : {}),
        ...(dto.endDate !== undefined ? { endDate: new Date(dto.endDate) } : {}),
        updatedAt: new Date(),
      },
      include: sprintInclude,
    });
    const response = this.toResponse(updated);
    this.realtime.emitDataChanged(sprint.projectId, 'sprint', 'updated', userId, response);
    return response;
  }

  async complete(userId: string, sprintId: string) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new ConflictException('Only an active sprint can be completed');
    }

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      const unfinished = await tx.task.findMany({
        where: { sprintId: sprint.id, archived: false, deletedAt: null, status: { not: TaskStatus.DONE } },
        select: { id: true },
      });
      await tx.task.updateMany({
        where: { id: { in: unfinished.map((task) => task.id) } },
        data: { sprintId: null, updatedAt: now },
      });
      return tx.sprint.update({
        where: { id: sprint.id },
        data: { status: SprintStatus.COMPLETED, completedAt: now, updatedAt: now },
        include: sprintInclude,
      });
    });
    const response = this.toResponse(result);
    this.realtime.emitDataChanged(sprint.projectId, 'sprint', 'updated', userId, response);
    return response;
  }

  async reopen(userId: string, sprintId: string) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.COMPLETED) {
      throw new ConflictException('Only a completed sprint can be reopened');
    }

    const updated = await this.prisma.sprint.update({
      where: { id: sprint.id },
      data: {
        status: SprintStatus.PLANNED,
        startedAt: null,
        completedAt: null,
        updatedAt: new Date(),
      },
      include: sprintInclude,
    });
    const response = this.toResponse(updated);
    this.realtime.emitDataChanged(sprint.projectId, 'sprint', 'updated', userId, response);
    return response;
  }

  private async getById(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId }, include: sprintInclude });
    if (!sprint) throw new NotFoundException('Sprint not found');
    return this.toResponse(sprint);
  }

  private async getSprintForManager(userId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.access.requireManager(userId, sprint.projectId);
    return sprint;
  }

  private assertSoftwareProject(projectType: string): void {
    if (projectType !== ProjectType.SOFTWARE_DEVELOPMENT) {
      throw new BadRequestException('Sprints are available only for software development projects');
    }
  }

  private async validateDateRange(startDate?: string, endDate?: string): Promise<void> {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ConflictException('Sprint start date cannot be after its end date');
    }
  }

  private toResponse(sprint: Prisma.SprintGetPayload<{ include: typeof sprintInclude }>) {
    return {
      id: sprint.id,
      projectId: sprint.projectId,
      name: sprint.name,
      goal: sprint.goal,
      status: sprint.status,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      startedAt: sprint.startedAt,
      completedAt: sprint.completedAt,
      createdBy: sprint.createdBy,
      createdAt: sprint.createdAt,
      updatedAt: sprint.updatedAt,
      tasks: sprint.tasks.map(toTaskResponse),
    };
  }
}
