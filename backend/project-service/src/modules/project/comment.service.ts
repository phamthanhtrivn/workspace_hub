import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectRole } from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ProjectAccessService } from './project-access.service';
import { toCommentResponse } from './project.mapper';
import { ActivityService } from './activity.service';
import { assertTaskEditable } from './task-edit.guard';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly activities: ActivityService,
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
    assertTaskEditable(task.status);
    const now = new Date();
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.taskComment.create({
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
      await this.activities.record(taskId, userId, 'comment_created', null, created.content, tx);
      return created;
    });
    return toCommentResponse(comment);
  }

  async update(userId: string, commentId: string, dto: UpdateCommentDto) {
    const comment = await this.findComment(commentId);
    const task = await this.findTask(comment.taskId);
    await this.requireCanManage(userId, task.projectId, comment.authorId);
    assertTaskEditable(task.status);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.taskComment.update({
        where: { id: commentId },
        data: { content: dto.content.trim(), edited: true, updatedAt: new Date() },
      });
      await this.activities.record(comment.taskId, userId, 'comment_updated', comment.content, result.content, tx);
      return result;
    });
    return toCommentResponse(updated);
  }

  async delete(userId: string, commentId: string): Promise<void> {
    const comment = await this.findComment(commentId);
    const task = await this.findTask(comment.taskId);
    await this.requireCanManage(userId, task.projectId, comment.authorId);
    assertTaskEditable(task.status);
    await this.prisma.$transaction(async (tx) => {
      await tx.taskComment.delete({ where: { id: commentId } });
      await this.activities.record(comment.taskId, userId, 'comment_deleted', comment.content, null, tx);
    });
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
