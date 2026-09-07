import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectMemberStatus, ProjectVisibility } from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';

export type ProjectWithSetting = Prisma.ProjectGetPayload<{
  include: { setting: true };
}>;

type DelegatedPermission =
  | 'canCreateTask'
  | 'canEditOwnTask'
  | 'canEditOthersTask'
  | 'canManageSprints'
  | 'canManageMembers'
  | 'canManageLabels';

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireReadAccess(
    userId: string,
    projectId: string,
  ): Promise<ProjectWithSetting> {
    const project = await this.findProject(projectId);
    const isOwner = project.ownerId === userId;
    const isPublic = project.visibility === ProjectVisibility.PUBLIC;
    const isMember = await this.isActiveMember(projectId, userId);

    if (!isOwner && !isPublic && !isMember) {
      throw new ForbiddenException('You do not have access to this project');
    }

    return project;
  }

  async requireOwner(
    userId: string,
    projectId: string,
  ): Promise<ProjectWithSetting> {
    const project = await this.findProject(projectId);
    if (project.ownerId !== userId) {
      throw new ForbiddenException('Project owner permission is required');
    }
    return project;
  }

  async requireCanCreateTask(
    userId: string,
    projectId: string,
  ): Promise<ProjectWithSetting> {
    const project = await this.requireReadAccess(userId, projectId);
    if (project.ownerId === userId) {
      return project;
    }

    return this.requireMemberPermission(
      userId,
      project,
      'canCreateTask',
      'You cannot create tasks in this project',
    );
  }

  async requireCanEditTask(
    userId: string,
    projectId: string,
    createdBy: string,
  ): Promise<ProjectWithSetting> {
    const project = await this.requireReadAccess(userId, projectId);
    if (project.ownerId === userId) {
      return project;
    }

    const isOwnTask = createdBy === userId;
    return this.requireMemberPermission(
      userId,
      project,
      isOwnTask ? 'canEditOwnTask' : 'canEditOthersTask',
      'You cannot edit this task',
    );
  }

  async requireCanInvite(
    userId: string,
    projectId: string,
  ): Promise<ProjectWithSetting> {
    return this.requireCanManageMembers(userId, projectId);
  }

  async requireCanManageSprints(
    userId: string,
    projectId: string,
  ): Promise<ProjectWithSetting> {
    return this.requireDelegatedPermission(
      userId,
      projectId,
      'canManageSprints',
      'You cannot manage sprints in this project',
    );
  }

  async requireCanManageMembers(
    userId: string,
    projectId: string,
  ): Promise<ProjectWithSetting> {
    return this.requireDelegatedPermission(
      userId,
      projectId,
      'canManageMembers',
      'You cannot manage members in this project',
    );
  }

  async requireCanManageLabels(
    userId: string,
    projectId: string,
  ): Promise<ProjectWithSetting> {
    return this.requireDelegatedPermission(
      userId,
      projectId,
      'canManageLabels',
      'You cannot manage labels in this project',
    );
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

  private async requireDelegatedPermission(
    userId: string,
    projectId: string,
    permission: DelegatedPermission,
    message: string,
  ): Promise<ProjectWithSetting> {
    const project = await this.requireReadAccess(userId, projectId);
    if (project.ownerId === userId) {
      return project;
    }
    return this.requireMemberPermission(userId, project, permission, message);
  }

  private async requireMemberPermission(
    userId: string,
    project: ProjectWithSetting,
    permission: DelegatedPermission,
    message: string,
  ): Promise<ProjectWithSetting> {
    const member = await this.getActiveMember(project.id, userId);
    if (!member[permission]) {
      throw new ForbiddenException(message);
    }
    return project;
  }
}
