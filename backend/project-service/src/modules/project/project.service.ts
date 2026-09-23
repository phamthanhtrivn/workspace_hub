import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ProjectMemberStatus,
  ProjectRole,
  ProjectStatus,
  TaskStatus,
} from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { InternalRenameProjectDto } from './dto/internal-rename-project.dto';
import { ProjectListQueryDto } from './dto/project-list-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectAccessService } from './project-access.service';
import { PROJECT_LIST_PAGE_SIZE } from './project.constants';
import { toMemberResponse, toProjectResponse } from './project.mapper';
import { rethrowWriteConflict } from '../../common/prisma/prisma-errors';
import { paginate } from '../../common/utils/pagination';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import {
  ProjectSpaceClient,
  ProjectSpaceRole,
} from './project-space.client';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly projectSpaces: ProjectSpaceClient,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const now = new Date();
    const startDate = this.toDate(dto.startDate);
    const dueDate = this.toDate(dto.dueDate);
    this.validateDateRange(startDate, dueDate);

    const project = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          id: crypto.randomUUID(),
          name: dto.name.trim(),
          color: dto.color,
          icon: dto.icon,
          description: dto.description,
          status: ProjectStatus.ACTIVE,
          ownerId: userId,
          archived: false,
          startDate,
          dueDate,
          createdAt: now,
          updatedAt: now,
          setting: {
            create: {
              id: crypto.randomUUID(),
              allowMemberCreateTask: true,
              allowMemberEditOthersTask: false,
              allowMemberEditOwnTask: true,
              allowMemberInvite: false,
            },
          },
          members: {
            create: {
              id: crypto.randomUUID(),
              userId,
              role: ProjectRole.ADMIN,
              status: ProjectMemberStatus.ACTIVE,
              canCreateTask: true,
              canEditOwnTask: true,
              canEditOthersTask: true,
              canManageMembers: true,
              canManageLabels: true,
              joinedAt: now,
              updatedAt: now,
            },
          },
        },
      });
      return created;
    });

    const ownerProfile = await this.userProfiles.getProfileByUserId(userId);
    return toProjectResponse(project, {}, ownerProfile);
  }

  async findAll(userId: string, query: ProjectListQueryDto) {
    const listQuery = {
      ...query,
      page: query.page ?? 1,
      limit: Math.min(query.limit ?? PROJECT_LIST_PAGE_SIZE, PROJECT_LIST_PAGE_SIZE),
    };
    const search = query.search?.trim();
    const where: Prisma.ProjectWhereInput = {
      archived: false,
      ...(query.status ? { status: query.status } : {}),
      AND: [
        {
          OR: [
            { ownerId: userId },
            {
              members: {
                some: { userId, status: ProjectMemberStatus.ACTIVE },
              },
            },
          ],
        },
        ...(search
          ? [
              {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  {
                    description: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                ],
              } satisfies Prisma.ProjectWhereInput,
            ]
          : []),
      ],
    };
    const [total, projects] = await this.prisma.$transaction([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
        include: { setting: true },
        skip: (listQuery.page - 1) * listQuery.limit,
        take: listQuery.limit,
      }),
    ]);
    const projectIds = projects.map((project) => project.id);
    const ownerIds = [...new Set(projects.map((project) => project.ownerId))];
    const [taskCounts, ownerProfiles] = await Promise.all([
      projectIds.length === 0
        ? []
        : this.prisma.task.groupBy({
            by: ['projectId', 'status'],
            where: {
              projectId: { in: projectIds },
              archived: false,
              deletedAt: null,
            },
            _count: { _all: true },
          }),
      this.userProfiles.getProfilesByUserIds(ownerIds),
    ]);

    const statsByProject = new Map<
      string,
      { total: number; completed: number }
    >();
    for (const count of taskCounts) {
      const stats = statsByProject.get(count.projectId) ?? {
        total: 0,
        completed: 0,
      };
      stats.total += count._count._all;
      if (count.status === TaskStatus.DONE)
        stats.completed += count._count._all;
      statsByProject.set(count.projectId, stats);
    }
    return paginate(
      projects.map((project) => {
        const stats = statsByProject.get(project.id);
        const ownerProfile = ownerProfiles.get(project.ownerId);
        return toProjectResponse(
          project,
          {
            totalTaskCount: stats?.total ?? 0,
            completedTaskCount: stats?.completed ?? 0,
          },
          ownerProfile,
        );
      }),
      total,
      listQuery,
    );
  }

  async findOne(userId: string, projectId: string) {
    const project = await this.access.requireReadAccess(userId, projectId);
    const ownerProfile = await this.userProfiles.getProfileByUserId(project.ownerId);
    return toProjectResponse(project, {}, ownerProfile);
  }

  async openProjectSpace(userId: string, projectId: string) {
    const project = await this.access.requireReadAccess(userId, projectId);
    const members = await this.prisma.projectMember.findMany({
      where: {
        projectId,
        status: ProjectMemberStatus.ACTIVE,
      },
      select: {
        userId: true,
        role: true,
      },
      orderBy: { joinedAt: 'asc' },
    });

    const roleByUserId = new Map<string, ProjectSpaceRole>();
    for (const member of members) {
      roleByUserId.set(
        member.userId,
        member.userId === project.ownerId || member.role === ProjectRole.ADMIN
          ? 'ADMIN'
          : 'MEMBER',
      );
    }
    roleByUserId.set(project.ownerId, 'ADMIN');

    try {
      return await this.projectSpaces.ensureProjectSpace({
        projectId,
        name: project.name,
        ownerId: project.ownerId,
        members: Array.from(roleByUserId.entries()).map(([memberUserId, role]) => ({
          userId: memberUserId,
          role,
        })),
      });
    } catch {
      throw new BadGatewayException('Unable to open project chat space');
    }
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    const current = await this.access.requireOwner(userId, projectId);
    if (current.archived || current.status === ProjectStatus.ARCHIVED) {
      const fields = Object.entries(dto).filter(([, value]) => value !== undefined);
      const isRestore = fields.length === 1 && dto.status === ProjectStatus.ACTIVE;
      if (!isRestore) {
        throw new ConflictException(
          'Archived projects are read-only; restore the project before editing it',
        );
      }
    }
    const data: Prisma.ProjectUpdateInput = {};

    let nextProjectName: string | undefined;
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Project name cannot be empty');
      }
      data.name = name;
      nextProjectName = name;
    }
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startDate !== undefined)
      data.startDate = this.toDate(dto.startDate);
    if (dto.dueDate !== undefined) data.dueDate = this.toDate(dto.dueDate);

    const startDate =
      dto.startDate !== undefined
        ? this.toDate(dto.startDate)
        : current.startDate;
    const dueDate =
      dto.dueDate !== undefined ? this.toDate(dto.dueDate) : current.dueDate;
    this.validateDateRange(startDate, dueDate);

    if (dto.status !== undefined) {
      data.status = dto.status;
      data.archived = dto.status === ProjectStatus.ARCHIVED;
    }

    let syncedProjectSpace = false;
    if (nextProjectName !== undefined && nextProjectName !== current.name) {
      try {
        const result = await this.projectSpaces.renameProjectSpace(
          projectId,
          nextProjectName,
          userId,
        );
        syncedProjectSpace = result.spaceId !== null;
      } catch {
        throw new BadGatewayException('Unable to sync project chat space name');
      }
    }

    let project;
    try {
      project = await this.prisma.project.update({
        where: { id: projectId, version: current.version },
        data: { ...data, version: { increment: 1 } },
      });
    } catch (error) {
      if (syncedProjectSpace) {
        await this.projectSpaces
          .renameProjectSpace(projectId, current.name, userId)
          .catch(() => undefined);
      }
      rethrowWriteConflict(error, 'Project was changed by another request');
    }

    const ownerProfile = await this.userProfiles.getProfileByUserId(project.ownerId);
    return toProjectResponse(project, {}, ownerProfile);
  }

  async renameProjectFromSpace(
    projectId: string,
    dto: InternalRenameProjectDto,
  ) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Project name cannot be empty');
    }

    const current = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        archived: true,
        status: true,
      },
    });
    if (!current) {
      throw new BadRequestException('Project not found');
    }
    if (current.archived || current.status === ProjectStatus.ARCHIVED) {
      throw new ConflictException(
        'Archived projects are read-only; restore the project before editing it',
      );
    }
    if (current.name === name) {
      return { projectId, name: current.name };
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: { name, version: { increment: 1 } },
      select: { id: true, name: true },
    });

    return { projectId: project.id, name: project.name };
  }

  async archive(userId: string, projectId: string): Promise<void> {
    const project = await this.access.requireOwner(userId, projectId);
    try {
      await this.prisma.project.update({
        where: { id: projectId, version: project.version },
        data: {
          status: ProjectStatus.ARCHIVED,
          archived: true,
          version: { increment: 1 },
        },
      });
    } catch (error) {
      rethrowWriteConflict(error, 'Project was changed by another request');
    }
  }

  async listMembers(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId, status: ProjectMemberStatus.ACTIVE },
      orderBy: { joinedAt: 'asc' },
    });

    const userIds = members.map((member) => member.userId);
    const profiles = await this.userProfiles.getProfilesByUserIds(userIds);

    return members.map((member) =>
      toMemberResponse(member, profiles.get(member.userId)),
    );
  }

  private toDate(value?: string | null): Date | null | undefined {
    return value == null ? value : new Date(value);
  }

  private validateDateRange(
    startDate?: Date | null,
    dueDate?: Date | null,
  ): void {
    if (startDate && dueDate && startDate > dueDate) {
      throw new ConflictException('Start date cannot be after due date');
    }
  }
}
