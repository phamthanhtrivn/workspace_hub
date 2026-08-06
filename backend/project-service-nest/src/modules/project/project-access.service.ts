import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectMemberStatus, ProjectRole, ProjectVisibility } from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';

export type ProjectWithSetting = Prisma.ProjectGetPayload<{
  include: { setting: true };
}>;

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireReadAccess(userId: string, projectId: string): Promise<ProjectWithSetting> {
    const project = await this.findProject(projectId);
    const isOwner = project.ownerId === userId;
    const isPublic = project.visibility === ProjectVisibility.PUBLIC;
    const isMember = await this.isActiveMember(projectId, userId);

    if (!isOwner && !isPublic && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async requireManager(userId: string, projectId: string): Promise<ProjectWithSetting> {
    const project = await this.findProject(projectId);
    if (project.ownerId === userId) {
      return project;
    }

    const member = await this.getActiveMember(projectId, userId);
    if (member.role !== ProjectRole.ADMIN) {
      throw new ForbiddenException('Project manager permission is required');
    }

    return project;
  }

  async requireCanCreateTask(userId: string, projectId: string): Promise<ProjectWithSetting> {
    const project = await this.requireReadAccess(userId, projectId);
    if (project.ownerId === userId) {
      return project;
    }

    const member = await this.getActiveMember(projectId, userId);
    const canCreate = member.role === ProjectRole.ADMIN
      || project.setting?.allowMemberCreateTask === true;

    if (!canCreate) {
      throw new ForbiddenException('You cannot create tasks in this project');
    }

    return project;
  }

  async requireCanEditTask(userId: string, projectId: string, createdBy: string): Promise<ProjectWithSetting> {
    const project = await this.requireReadAccess(userId, projectId);
    if (project.ownerId === userId) {
      return project;
    }

    const member = await this.getActiveMember(projectId, userId);
    if (member.role === ProjectRole.ADMIN) {
      return project;
    }

    const isOwnTask = createdBy === userId;
    const canEdit = isOwnTask
      ? project.setting?.allowMemberEditOwnTask === true
      : project.setting?.allowMemberEditOthersTask === true;

    if (!canEdit) {
      throw new ForbiddenException('You cannot edit this task');
    }

    return project;
  }

  async requireCanInvite(userId: string, projectId: string): Promise<ProjectWithSetting> {
    const project = await this.requireManagerOrMemberInvite(userId, projectId);
    return project;
  }

  async findProject(projectId: string): Promise<ProjectWithSetting> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { setting: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async getActiveMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!member || member.status !== ProjectMemberStatus.ACTIVE) {
      throw new ForbiddenException('You are not an active project member');
    }

    return member;
  }

  async isActiveMember(projectId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { status: true },
    });

    return member?.status === ProjectMemberStatus.ACTIVE;
  }

  private async requireManagerOrMemberInvite(userId: string, projectId: string): Promise<ProjectWithSetting> {
    const project = await this.findProject(projectId);
    if (project.ownerId === userId) {
      return project;
    }

    const member = await this.getActiveMember(projectId, userId);
    const canInvite = member.role === ProjectRole.ADMIN
      || project.setting?.allowMemberInvite === true;

    if (!canInvite) {
      throw new ForbiddenException('You cannot invite members to this project');
    }

    return project;
  }
}
