import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProjectMemberStatus, ProjectRole, ProjectStatus, ProjectTemplate, ProjectType, ProjectVisibility } from './project.enums';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectAccessService } from './project-access.service';
import { toMemberResponse, toProjectResponse } from './project.mapper';
import { ProjectGateway } from './project.gateway';
import { ProjectRealtimeEvent } from './project.events';

@Injectable()
export class ProjectService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly realtime: ProjectGateway,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const now = new Date();
    const startDate = this.toDate(dto.startDate);
    const dueDate = this.toDate(dto.dueDate);
    this.validateDateRange(startDate, dueDate);

    const project = await this.prisma.project.create({
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

    if (dto.template && dto.template !== ProjectTemplate.EMPTY) {
      await this.createTemplateTasks(project.id, userId, dto.template);
    }

    const response = toProjectResponse(project);
    this.realtime.emitToUser(userId, ProjectRealtimeEvent.PROJECT_CREATED, response);
    return response;
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
    const response = toProjectResponse(project);
    this.realtime.emitToProject(projectId, ProjectRealtimeEvent.PROJECT_UPDATED, {
      project: response,
      actorId: userId,
    });
    return response;
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
    this.realtime.emitToProject(projectId, ProjectRealtimeEvent.PROJECT_ARCHIVED, {
      projectId,
      actorId: userId,
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

  private async createTemplateTasks(projectId: string, userId: string, template: ProjectTemplate): Promise<void> {
    const roots = template === ProjectTemplate.SOFTWARE_SCRUM
      ? [['Define product backlog', ['Write user stories', 'Prioritize MVP scope']], ['Build first increment', ['Implement core flow', 'Review with team']], ['Quality and release', ['Prepare test plan', 'Create release notes']]]
      : template === ProjectTemplate.MARKETING_CAMPAIGN
        ? [['Campaign goals', ['Define audience', 'Set success metrics']], ['Content production', ['Create content calendar', 'Review campaign assets']], ['Launch and measure', ['Publish campaign', 'Track performance']]]
        : [['Event objectives', ['Confirm target audience', 'Define event scope']], ['Event preparation', ['Book venue and vendors', 'Prepare communication plan']], ['Event execution', ['Run event checklist', 'Collect feedback']]];
    const now = new Date();

    for (const [rootIndex, root] of roots.entries()) {
      const parent = await this.prisma.task.create({
        data: {
          id: crypto.randomUUID(), projectId, title: root[0] as string, description: 'Task mẫu từ Project Template.',
          priority: rootIndex === 0 ? 'HIGH' : 'MEDIUM', status: 'TODO', createdBy: userId, reporterId: userId,
          allDay: false, estimatedMinutes: 180, rank: String((rootIndex + 1) * 1000), archived: false,
          isParentTask: true, autoCompleteSprint: false, createdAt: now, updatedAt: now,
        },
      });
      for (const [childIndex, childTitle] of (root[1] as string[]).entries()) {
        const child = await this.prisma.task.create({
          data: {
            id: crypto.randomUUID(), projectId, parentTaskId: parent.id, title: childTitle,
            description: 'Subtask mẫu từ Project Template.', priority: 'MEDIUM', status: 'TODO', createdBy: userId,
            reporterId: userId, allDay: false, estimatedMinutes: 60, rank: String((childIndex + 1) * 100), archived: false,
            isParentTask: false, autoCompleteSprint: false, createdAt: now, updatedAt: now,
          },
        });
        await this.prisma.taskChecklist.createMany({ data: [
          { id: crypto.randomUUID(), taskId: child.id, title: 'Xác định phạm vi công việc', completed: false, createdAt: now, rank: '001' },
          { id: crypto.randomUUID(), taskId: child.id, title: 'Cập nhật kết quả thực hiện', completed: false, createdAt: now, rank: '002' },
        ] });
      }
      await this.prisma.taskChecklist.createMany({ data: [
        { id: crypto.randomUUID(), taskId: parent.id, title: 'Review mục tiêu task', completed: false, createdAt: now, rank: '001' },
        { id: crypto.randomUUID(), taskId: parent.id, title: 'Xác nhận hoàn thành', completed: false, createdAt: now, rank: '002' },
      ] });
    }
  }
}
