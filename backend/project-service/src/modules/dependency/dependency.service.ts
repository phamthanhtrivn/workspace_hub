import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from '../project/project-access.service';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { wouldCreateDependencyCycle } from './dependency-cycle';
import { TaskStatus, isTerminalTaskStatus } from '../project/project.enums';
import { ActivityService } from '../activity/activity.service';

const PARENT_SUBTASK_DEPENDENCY_ERROR =
  'A task cannot depend on its parent or subtask.';
const CLOSED_SUCCESSOR_DEPENDENCY_ERROR =
  'Closed tasks cannot change dependencies.';

@Injectable()
export class DependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly activities: ActivityService,
  ) {}

  async list(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    return this.prisma.taskDependency.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  }

  async create(userId: string, successorTaskId: string, dto: CreateDependencyDto) {
    const successor = await this.requireDependencySuccessor(userId, successorTaskId);
    const predecessor = await this.prisma.task.findFirst({
      where: { id: dto.predecessorTaskId, deletedAt: null },
      select: {
        id: true,
        projectId: true,
        status: true,
        parentTaskId: true,
      },
    });
    if (!predecessor || predecessor.projectId !== successor.projectId) throw new ConflictException('Tasks must belong to the same project');
    if (predecessor.id === successor.id) throw new ConflictException('A task cannot depend on itself');
    if (predecessor.status === TaskStatus.CANCELLED) {
      throw new ConflictException('Cancelled tasks cannot be used as dependencies');
    }
    if (this.isParentChildDependency(predecessor, successor)) {
      throw new ConflictException(PARENT_SUBTASK_DEPENDENCY_ERROR);
    }
    const dependencies = await this.prisma.taskDependency.findMany({
      where: { projectId: successor.projectId },
      select: { predecessorTaskId: true, successorTaskId: true },
    });
    if (wouldCreateDependencyCycle(dependencies, predecessor.id, successor.id)) {
      throw new ConflictException('This dependency would create a cycle');
    }
    return this.prisma.$transaction(async (tx) => {
      const where = { projectId_predecessorTaskId_successorTaskId: { projectId: successor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id } };
      const previous = await tx.taskDependency.findUnique({ where });
      const dependency = await tx.taskDependency.upsert({
      where,
      create: { id: crypto.randomUUID(), projectId: successor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id, dependencyType: dto.dependencyType, createdBy: userId, createdAt: new Date() },
      update: { dependencyType: dto.dependencyType },
      });
      if (previous?.dependencyType !== dependency.dependencyType) await this.activities.record(successorTaskId, userId, 'dependency',
        previous ? { predecessorTaskId: predecessor.id, type: previous.dependencyType } : null,
        { predecessorTaskId: predecessor.id, type: dependency.dependencyType }, tx);
      if (previous?.dependencyType !== dependency.dependencyType) await this.activities.record(predecessor.id, userId, 'dependency',
        previous ? { successorTaskId, type: previous.dependencyType } : null, { successorTaskId, type: dependency.dependencyType }, tx);
      return dependency;
    });
  }

  async remove(userId: string, successorTaskId: string, predecessorTaskId: string) {
    const successor = await this.requireDependencySuccessor(userId, successorTaskId);
    const predecessor = await this.prisma.task.findFirst({
      where: { id: predecessorTaskId, deletedAt: null },
      select: { projectId: true },
    });
    if (!predecessor || predecessor.projectId !== successor.projectId) {
      throw new NotFoundException('Predecessor task not found');
    }
    await this.prisma.$transaction(async (tx) => {
      const removed = await tx.taskDependency.deleteMany({ where: { projectId: successor.projectId, successorTaskId, predecessorTaskId } });
      if (removed.count) await this.activities.record(successorTaskId, userId, 'dependency', { predecessorTaskId }, null, tx);
      if (removed.count) await this.activities.record(predecessorTaskId, userId, 'dependency', { successorTaskId }, null, tx);
    });
    return { successorTaskId, predecessorTaskId };
  }

  private async requireDependencySuccessor(userId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        projectId: true,
        createdBy: true,
        status: true,
        parentTaskId: true,
      },
    });
    if (!task) throw new NotFoundException('Successor task not found');
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    if (isTerminalTaskStatus(task.status)) {
      throw new ConflictException(CLOSED_SUCCESSOR_DEPENDENCY_ERROR);
    }
    return task;
  }

  private isParentChildDependency(
    predecessor: { id: string; parentTaskId: string | null },
    successor: { id: string; parentTaskId: string | null },
  ): boolean {
    return (
      predecessor.parentTaskId === successor.id ||
      successor.parentTaskId === predecessor.id
    );
  }
}
