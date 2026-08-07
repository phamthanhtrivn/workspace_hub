import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { CreateDependencyDto } from '../dto/create-dependency.dto';
import { ProjectGateway } from '../events/project.gateway';

@Injectable()
export class DependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: ProjectGateway,
  ) {}

  async list(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    return this.prisma.taskDependency.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  }

  async create(userId: string, successorTaskId: string, dto: CreateDependencyDto) {
    const successor = await this.prisma.task.findUnique({ where: { id: successorTaskId }, select: { id: true, projectId: true, createdBy: true } });
    if (!successor) throw new NotFoundException('Successor task not found');
    await this.access.requireCanEditTask(userId, successor.projectId, successor.createdBy);
    const predecessor = await this.prisma.task.findUnique({ where: { id: dto.predecessorTaskId }, select: { id: true, projectId: true } });
    if (!predecessor || predecessor.projectId !== successor.projectId) throw new ConflictException('Tasks must belong to the same project');
    if (predecessor.id === successor.id) throw new ConflictException('A task cannot depend on itself');
    const dependency = await this.prisma.taskDependency.upsert({
      where: { projectId_predecessorTaskId_successorTaskId: { projectId: successor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id } },
      create: { id: crypto.randomUUID(), projectId: successor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id, dependencyType: dto.dependencyType, createdBy: userId, createdAt: new Date() },
      update: { dependencyType: dto.dependencyType },
    });
    this.realtime.emitDataChanged(successor.projectId, 'dependency', 'created', userId, dependency);
    return dependency;
  }

  async remove(userId: string, successorTaskId: string, predecessorTaskId: string) {
    const successor = await this.prisma.task.findUnique({ where: { id: successorTaskId }, select: { projectId: true, createdBy: true } });
    if (!successor) throw new NotFoundException('Successor task not found');
    await this.access.requireCanEditTask(userId, successor.projectId, successor.createdBy);
    await this.prisma.taskDependency.deleteMany({ where: { projectId: successor.projectId, successorTaskId, predecessorTaskId } });
    this.realtime.emitDataChanged(successor.projectId, 'dependency', 'deleted', userId, { successorTaskId, predecessorTaskId });
    return { successorTaskId, predecessorTaskId };
  }
}
