import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRole } from '../project.enums';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCommentDto } from '../dto/create-comment.dto';
import { UpdateCommentDto } from '../dto/update-comment.dto';
import { ProjectAccessService } from './project-access.service';
import { toCommentResponse } from '../mappers/project.mapper';
import { ProjectGateway } from '../events/project.gateway';
import { ProjectRealtimeAction, ProjectRealtimeResource } from '../events/project.events';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: ProjectGateway,
  ) {}

  async findAll(userId: string, taskId: string) {
    const task = await this.findTask(taskId);
    await this.access.requireReadAccess(userId, task.projectId);
    const comments = await this.prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });
    return comments.map(toCommentResponse);
  }

  async create(userId: string, taskId: string, dto: CreateCommentDto) {
    const task = await this.findTask(taskId);
    await this.requireWriteAccess(userId, task.projectId);
    const now = new Date();
    const comment = await this.prisma.taskComment.create({
      data: {
        id: crypto.randomUUID(),
        taskId,
        authorId: userId,
        content: dto.content.trim(),
        edited: false,
        createdAt: now,
        updatedAt: now,
      },
    });
    const response = toCommentResponse(comment);
    this.realtime.emitDataChanged(task.projectId, ProjectRealtimeResource.COMMENT, ProjectRealtimeAction.CREATED, userId, response);
    return response;
  }

  async update(userId: string, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.findComment(commentId);
    const task = await this.findTask(comment.taskId);
    await this.requireCanManage(userId, task.projectId, comment.authorId);
    const updated = await this.prisma.taskComment.update({
      where: { id: commentId },
      data: { content: dto.content.trim(), edited: true, updatedAt: new Date() },
    });
    const response = toCommentResponse(updated);
    this.realtime.emitDataChanged(task.projectId, ProjectRealtimeResource.COMMENT, ProjectRealtimeAction.UPDATED, userId, response);
    return response;
  }

  async delete(userId: string, commentId: string): Promise<void> {
    const comment = await this.findComment(commentId);
    const task = await this.findTask(comment.taskId);
    await this.requireCanManage(userId, task.projectId, comment.authorId);
    await this.prisma.taskComment.delete({ where: { id: commentId } });
    this.realtime.emitDataChanged(task.projectId, ProjectRealtimeResource.COMMENT, ProjectRealtimeAction.DELETED, userId, { id: commentId });
  }

  private async requireWriteAccess(userId: string, projectId: string): Promise<void> {
    const project = await this.access.requireReadAccess(userId, projectId);
    if (project.ownerId === userId) return;
    const member = await this.access.getActiveMember(projectId, userId);
    if (member.role !== ProjectRole.ADMIN && member.role !== ProjectRole.MEMBER) {
      throw new ForbiddenException('Project write access is required');
    }
  }

  private async requireCanManage(userId: string, projectId: string, authorId: string): Promise<void> {
    await this.requireWriteAccess(userId, projectId);
    if (userId === authorId) return;
    const project = await this.access.findProject(projectId);
    if (project.ownerId === userId) return;
    const member = await this.access.getActiveMember(projectId, userId);
    if (member.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException('You cannot manage this comment');
    }
  }

  private async findTask(taskId: string) {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, deletedAt: null } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  private async findComment(commentId: string) {
    const comment = await this.prisma.taskComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    return comment;
  }
}
