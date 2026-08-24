import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectMemberStatus, ProjectRole, ProjectStatus, ProjectTemplate, ProjectType, ProjectVisibility } from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectAccessService } from './project-access.service';
import { toMemberResponse, toProjectResponse } from './project.mapper';
import { ProjectTemplateService } from './project-template.service';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly templates: ProjectTemplateService,
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
          projectType: dto.projectType ?? ProjectType.GENERAL,
          visibility: dto.visibility ?? ProjectVisibility.MEMBERS_ONLY,
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
              role: ProjectRole.OWNER,
              status: ProjectMemberStatus.ACTIVE,
              joinedAt: now,
              updatedAt: now,
            },
          },
        },
      });
      await this.templates.initialize(tx, created.id, userId, dto.template ?? ProjectTemplate.EMPTY, now);
      return created;
    });

    return toProjectResponse(project);
  }

  async findAll(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        archived: false,
        OR: [
          { visibility: ProjectVisibility.PUBLIC },
          { ownerId: userId },
          { members: { some: { userId, status: ProjectMemberStatus.ACTIVE } } },
        ],
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return projects.map(toProjectResponse);
  }

  async findOne(userId: string, projectId: string) {
    const project = await this.access.requireReadAccess(userId, projectId);
    return toProjectResponse(project);
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    const current = await this.access.requireManager(userId, projectId);
    const data: Prisma.ProjectUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException('Project name cannot be empty');
      }
      data.name = name;
    }
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.projectType !== undefined) data.projectType = dto.projectType;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.startDate !== undefined) data.startDate = this.toDate(dto.startDate);
    if (dto.dueDate !== undefined) data.dueDate = this.toDate(dto.dueDate);

    const startDate = dto.startDate !== undefined ? this.toDate(dto.startDate) : current.startDate;
    const dueDate = dto.dueDate !== undefined ? this.toDate(dto.dueDate) : current.dueDate;
    this.validateDateRange(startDate, dueDate);

    if (dto.status !== undefined) {
      data.status = dto.status;
      data.archived = dto.status === ProjectStatus.ARCHIVED;
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data,
    });

    return toProjectResponse(project);
  }

  async archive(userId: string, projectId: string): Promise<void> {
    await this.access.requireManager(userId, projectId);
    await this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED, archived: true },
    });
  }

  async listMembers(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId, status: ProjectMemberStatus.ACTIVE },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map(toMemberResponse);
  }

  private toDate(value?: string): Date | undefined {
    return value === undefined ? undefined : new Date(value);
  }

  private validateDateRange(startDate?: Date | null, dueDate?: Date | null): void {
    if (startDate && dueDate && startDate > dueDate) {
      throw new ConflictException('Start date cannot be after due date');
    }
  }

}
