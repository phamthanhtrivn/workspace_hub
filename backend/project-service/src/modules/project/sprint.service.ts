import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { ProjectType, SprintStatus, TaskStatus } from './project.enums';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { AddSprintTasksDto } from './dto/add-sprint-tasks.dto';
import { UpdateSprintDto } from './dto/update-sprint.dto';
import { toTaskResponse } from './project.mapper';
import { assertTaskEditable } from './task-edit.guard';
import {
  isRecordNotFoundError,
  isUniqueConstraintError,
  rethrowWriteConflict,
} from '../../common/prisma/prisma-errors';

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
    const project = await this.access.requireCanManageSprints(
      userId,
      projectId,
    );
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
    return this.toResponse(sprint);
  }

  async addTasks(userId: string, sprintId: string, dto: AddSprintTasksDto) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.PLANNED) {
      throw new ConflictException(
        'Tasks can only be added to a planned sprint',
      );
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        projectId: sprint.projectId,
        archived: false,
        deletedAt: null,
        id: { in: dto.taskIds },
      },
      select: { id: true, parentTaskId: true, status: true },
    });
    if (tasks.length !== dto.taskIds.length) {
      throw new NotFoundException(
        'One or more tasks were not found in this project',
      );
    }
    tasks.forEach((task) => assertTaskEditable(task.status));

    const selectedIds = tasks.map((task) => task.id);
    const childTasks = await this.prisma.task.findMany({
      where: {
        projectId: sprint.projectId,
        parentTaskId: { in: selectedIds },
        archived: false,
        deletedAt: null,
      },
      select: { id: true, status: true },
    });
    childTasks.forEach((task) => assertTaskEditable(task.status));
    const allTaskIds = [
      ...new Set([...selectedIds, ...childTasks.map((task) => task.id)]),
    ];
    await this.prisma.task.updateMany({
      where: { id: { in: allTaskIds } },
      data: { sprintId: sprint.id, updatedAt: new Date() },
    });
    return this.getById(sprint.id);
  }

  async removeTask(userId: string, sprintId: string, taskId: string) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.PLANNED) {
      throw new ConflictException(
        'Tasks can only be moved back from a planned sprint',
      );
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: sprint.projectId,
        sprintId: sprint.id,
        archived: false,
        deletedAt: null,
      },
      select: { id: true, status: true },
    });
    if (!task) throw new NotFoundException('Task not found in this sprint');
    assertTaskEditable(task.status);

    const childTasks = await this.prisma.task.findMany({
      where: {
        projectId: sprint.projectId,
        parentTaskId: task.id,
        sprintId: sprint.id,
        archived: false,
        deletedAt: null,
      },
      select: { id: true, status: true },
    });
    childTasks.forEach((child) => assertTaskEditable(child.status));
    await this.prisma.task.updateMany({
      where: { id: { in: [task.id, ...childTasks.map((child) => child.id)] } },
      data: { sprintId: null, updatedAt: new Date() },
    });
    return this.getById(sprint.id);
  }

  async start(userId: string, sprintId: string) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.PLANNED) {
      throw new ConflictException('Only a planned sprint can be started');
    }
    const now = new Date();
    try {
      const updated = await this.prisma.sprint.update({
        where: { id: sprint.id, version: sprint.version },
        data: {
          status: SprintStatus.ACTIVE,
          startedAt: now,
          updatedAt: now,
          version: { increment: 1 },
        },
        include: sprintInclude,
      });
      return this.toResponse(updated);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'This project already has an active sprint',
        );
      }
      if (isRecordNotFoundError(error)) {
        throw new ConflictException('Sprint was changed by another request');
      }
      throw error;
    }
  }

  async update(userId: string, sprintId: string, dto: UpdateSprintDto) {
    const sprint = await this.getSprintForManager(userId, sprintId);

    const startDate = dto.startDate
      ? new Date(dto.startDate)
      : sprint.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : sprint.endDate;
    await this.validateDateRange(
      startDate?.toISOString(),
      endDate?.toISOString(),
    );

    try {
      const updated = await this.prisma.sprint.update({
        where: { id: sprint.id, version: sprint.version },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.goal !== undefined ? { goal: dto.goal.trim() || null } : {}),
          ...(dto.startDate !== undefined
            ? { startDate: new Date(dto.startDate) }
            : {}),
          ...(dto.endDate !== undefined
            ? { endDate: new Date(dto.endDate) }
            : {}),
          updatedAt: new Date(),
          version: { increment: 1 },
        },
        include: sprintInclude,
      });
      return this.toResponse(updated);
    } catch (error) {
      rethrowWriteConflict(error, 'Sprint was changed by another request');
    }
  }

  async complete(userId: string, sprintId: string) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new ConflictException('Only an active sprint can be completed');
    }

    const now = new Date();
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const unfinished = await tx.task.findMany({
          where: {
            sprintId: sprint.id,
            archived: false,
            deletedAt: null,
            status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
          },
          select: { id: true },
        });
        await tx.task.updateMany({
          where: { id: { in: unfinished.map((task) => task.id) } },
          data: { sprintId: null, updatedAt: now },
        });
        return tx.sprint.update({
          where: { id: sprint.id, version: sprint.version },
          data: {
            status: SprintStatus.COMPLETED,
            completedAt: now,
            updatedAt: now,
            version: { increment: 1 },
          },
          include: sprintInclude,
        });
      });
      return this.toResponse(result);
    } catch (error) {
      rethrowWriteConflict(error, 'Sprint was changed by another request');
    }
  }

  async reopen(userId: string, sprintId: string) {
    const sprint = await this.getSprintForManager(userId, sprintId);
    if (sprint.status !== SprintStatus.COMPLETED) {
      throw new ConflictException('Only a completed sprint can be reopened');
    }

    try {
      const updated = await this.prisma.sprint.update({
        where: { id: sprint.id, version: sprint.version },
        data: {
          status: SprintStatus.PLANNED,
          startedAt: null,
          completedAt: null,
          updatedAt: new Date(),
          version: { increment: 1 },
        },
        include: sprintInclude,
      });
      return this.toResponse(updated);
    } catch (error) {
      rethrowWriteConflict(error, 'Sprint was changed by another request');
    }
  }

  private async getById(sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: sprintInclude,
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    return this.toResponse(sprint);
  }

  private async getSprintForManager(userId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
    });
    if (!sprint) throw new NotFoundException('Sprint not found');
    await this.access.requireCanManageSprints(userId, sprint.projectId);
    return sprint;
  }

  private assertSoftwareProject(projectType: string): void {
    if (projectType !== ProjectType.SOFTWARE_DEVELOPMENT) {
      throw new BadRequestException(
        'Sprints are available only for software development projects',
      );
    }
  }

  private async validateDateRange(
    startDate?: string,
    endDate?: string,
  ): Promise<void> {
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new ConflictException(
        'Sprint start date cannot be after its end date',
      );
    }
  }

  private toResponse(
    sprint: Prisma.SprintGetPayload<{ include: typeof sprintInclude }>,
  ) {
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
