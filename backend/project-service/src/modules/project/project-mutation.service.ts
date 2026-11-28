import { enqueueProjectAccessSync } from "./project-access-sync";
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ProjectMemberStatus,
  ProjectRole,
  ProjectStatus,
} from "./project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateProjectDto } from "./dto/create-project.dto";
import { InternalRenameProjectDto } from "./dto/internal-rename-project.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { ProjectAccessService } from "./project-access.service";
import {
  PROJECT_DATE_MESSAGES,
  PROJECT_DATE_TIME_ZONE,
} from "./project.constants";
import { toProjectResponse } from "./project.mapper";
import { rethrowWriteConflict } from "../../common/prisma/prisma-errors";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import { ProjectQueryService } from "./project-query.service";

@Injectable()
export class ProjectMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly access: ProjectAccessService,
    private readonly queries: ProjectQueryService,
  ) {}
  async create(userId: string, dto: CreateProjectDto) {
    const now = new Date();
    const startDate = this.toDate(dto.startDate);
    const dueDate = this.toDate(dto.dueDate);
    this.validateCreateDates(startDate, dueDate, now);
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
              canEditDocuments: true,
              joinedAt: now,
              updatedAt: now,
            },
          },
        },
      });
      await enqueueProjectAccessSync(tx, created.id);
      return created;
    });

    const ownerProfile = await this.userProfiles.getProfileByUserId(userId);
    return {
      ...toProjectResponse(project, {}, ownerProfile),
      accessSync: {
        projectId: project.id,
        documents: "PENDING",
        chat: "PENDING",
        message: null,
      },
    };
  }

  async retryAccessSync(userId: string, projectId: string) {
    await this.access.requireReadAccess(userId, projectId);
    await this.prisma.$transaction((tx) =>
      enqueueProjectAccessSync(tx, projectId),
    );
    return this.queries.getAccessSync(userId, projectId);
  }

  async update(userId: string, projectId: string, dto: UpdateProjectDto) {
    const current = await this.access.requireOwner(userId, projectId);
    if (current.archived || current.status === ProjectStatus.ARCHIVED) {
      const fields = Object.entries(dto).filter(
        ([, value]) => value !== undefined,
      );
      const isRestore =
        fields.length === 1 && dto.status === ProjectStatus.ACTIVE;
      if (!isRestore) {
        throw new ConflictException(
          "Archived projects are read-only; restore the project before editing it",
        );
      }
    }
    const data: Prisma.ProjectUpdateInput = {};

    let nextProjectName: string | undefined;
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) {
        throw new BadRequestException("Project name cannot be empty");
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

    let project;
    try {
      project = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.project.update({
          where: { id: projectId, version: current.version },
          data: { ...data, version: { increment: 1 } },
        });
        if (nextProjectName !== undefined && nextProjectName !== current.name)
          await enqueueProjectAccessSync(tx, projectId);
        return updated;
      });
    } catch (error) {
      rethrowWriteConflict(error, "Project was changed by another request");
    }

    const ownerProfile = await this.userProfiles.getProfileByUserId(
      project.ownerId,
    );
    return toProjectResponse(project, {}, ownerProfile);
  }

  async renameProjectFromSpace(
    projectId: string,
    dto: InternalRenameProjectDto,
  ) {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException("Project name cannot be empty");
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
      throw new BadRequestException("Project not found");
    }
    if (current.archived || current.status === ProjectStatus.ARCHIVED) {
      throw new ConflictException(
        "Archived projects are read-only; restore the project before editing it",
      );
    }
    if (current.name === name) {
      return { projectId, name: current.name };
    }

    const project = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.project.update({
        where: { id: projectId },
        data: { name, version: { increment: 1 } },
        select: { id: true, name: true },
      });
      await enqueueProjectAccessSync(tx, projectId);
      return updated;
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
      rethrowWriteConflict(error, "Project was changed by another request");
    }
  }

  toDate(value?: string | null): Date | null | undefined {
    return value == null ? value : new Date(value);
  }

  validateCreateDates(
    startDate: Date | null | undefined,
    dueDate: Date | null | undefined,
    now: Date,
  ): void {
    if (dueDate && !startDate) {
      throw new BadRequestException(
        PROJECT_DATE_MESSAGES.startDateRequiredForEndDate,
      );
    }
    if (!startDate) return;

    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: PROJECT_DATE_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    if (formatter.format(startDate) < formatter.format(now)) {
      throw new BadRequestException(PROJECT_DATE_MESSAGES.startDateInPast);
    }
  }

  validateDateRange(startDate?: Date | null, dueDate?: Date | null): void {
    if (startDate && dueDate && startDate > dueDate) {
      throw new ConflictException(PROJECT_DATE_MESSAGES.invalidDateRange);
    }
  }
}
