import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from '../project/project-access.service';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { wouldCreateDependencyCycle } from './dependency-cycle';
import { TaskStatus, isTerminalTaskStatus } from '../project/project.enums';

const PARENT_SUBTASK_DEPENDENCY_ERROR =
  'A task cannot depend on its parent or subtask.';
const CLOSED_SUCCESSOR_DEPENDENCY_ERROR =
  'Closed tasks cannot change dependencies.';

@Injectable()
export class DependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
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
        archived: true,
        parentTaskId: true,
      },
    });
    if (!predecessor || predecessor.projectId !== successor.projectId) throw new ConflictException('Tasks must belong to the same project');
    if (predecessor.id === successor.id) throw new ConflictException('A task cannot depend on itself');
    if (predecessor.archived) throw new ConflictException('Archived tasks cannot be used as dependencies');
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
    return this.prisma.taskDependency.upsert({
      where: { projectId_predecessorTaskId_successorTaskId: { projectId: successor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id } },
      create: { id: crypto.randomUUID(), projectId: successor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id, dependencyType: dto.dependencyType, createdBy: userId, createdAt: new Date() },
      update: { dependencyType: dto.dependencyType },
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
    await this.prisma.taskDependency.deleteMany({ where: { projectId: successor.projectId, successorTaskId, predecessorTaskId } });
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
        archived: true,
        parentTaskId: true,
      },
    });
    if (!task) throw new NotFoundException('Successor task not found');
    await this.access.requireCanEditTask(userId, task.projectId, task.createdBy);
    if (task.archived) throw new ConflictException('Archived tasks cannot change dependencies');
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
