import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProjectAccessService } from './project-access.service';
import { CreateDependencyDto } from './dto/create-dependency.dto';
import { assertTaskEditable } from './task-edit.guard';

@Injectable()
export class DependencyService {
  constructor(private readonly prisma: PrismaService, private readonly access: ProjectAccessService) {}

  async list(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    return this.prisma.taskDependency.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } });
  }

  async create(userId: string, successorTaskId: string, dto: CreateDependencyDto) {
    const successor = await this.prisma.task.findUnique({ where: { id: successorTaskId }, select: { id: true, projectId: true, createdBy: true, status: true } });
    if (!successor) throw new NotFoundException('Successor task not found');
    await this.access.requireCanEditTask(userId, successor.projectId, successor.createdBy);
    assertTaskEditable(successor.status);
    const predecessor = await this.prisma.task.findUnique({ where: { id: dto.predecessorTaskId }, select: { id: true, projectId: true, status: true } });
    if (!predecessor || predecessor.projectId !== successor.projectId) throw new ConflictException('Tasks must belong to the same project');
    if (predecessor.id === successor.id) throw new ConflictException('A task cannot depend on itself');
    assertTaskEditable(predecessor.status);
    return this.prisma.taskDependency.upsert({
      where: { projectId_predecessorTaskId_successorTaskId: { projectId: successor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id } },
      create: { id: crypto.randomUUID(), projectId: successor.projectId, predecessorTaskId: predecessor.id, successorTaskId: successor.id, dependencyType: dto.dependencyType, createdBy: userId, createdAt: new Date() },
      update: { dependencyType: dto.dependencyType },
    });
  }

  async remove(userId: string, successorTaskId: string, predecessorTaskId: string) {
    const successor = await this.prisma.task.findUnique({ where: { id: successorTaskId }, select: { projectId: true, createdBy: true, status: true } });
    if (!successor) throw new NotFoundException('Successor task not found');
    await this.access.requireCanEditTask(userId, successor.projectId, successor.createdBy);
    assertTaskEditable(successor.status);
    const predecessor = await this.prisma.task.findUnique({ where: { id: predecessorTaskId }, select: { status: true } });
    if (!predecessor) throw new NotFoundException('Predecessor task not found');
    assertTaskEditable(predecessor.status);
    await this.prisma.taskDependency.deleteMany({ where: { projectId: successor.projectId, successorTaskId, predecessorTaskId } });
    return { successorTaskId, predecessorTaskId };
  }
}
