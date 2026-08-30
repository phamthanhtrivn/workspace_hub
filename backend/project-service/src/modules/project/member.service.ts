import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectMemberStatus, ProjectRole } from "./project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AddMemberDto } from "./dto/add-member.dto";
import { UpdateMemberPermissionsDto } from "./dto/update-member-permissions.dto";
import { ProjectAccessService } from "./project-access.service";
import { toMemberResponse } from "./project.mapper";
import { TaskCalendarEventService } from "./task-calendar-event.service";
import {
  isUniqueConstraintError,
  rethrowWriteConflict,
} from "../../common/prisma/prisma-errors";

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly calendarEvents: TaskCalendarEventService,
  ) {}

  async add(userId: string, projectId: string, dto: AddMemberDto) {
    await this.access.requireCanManageMembers(userId, projectId);
    const now = new Date();

    const reactivated = await this.prisma.projectMember.updateMany({
      where: {
        projectId,
        userId: dto.userId,
        status: { not: ProjectMemberStatus.ACTIVE },
      },
      data: {
        role: ProjectRole.MEMBER,
        status: ProjectMemberStatus.ACTIVE,
        canCreateTask: false,
        canEditOwnTask: false,
        canEditOthersTask: false,
        canManageSprints: false,
        canManageMembers: false,
        canManageLabels: false,
        leftAt: null,
        updatedAt: now,
        version: { increment: 1 },
      },
    });
    if (reactivated.count === 1) {
      const member = await this.prisma.projectMember.findUniqueOrThrow({
        where: { projectId_userId: { projectId, userId: dto.userId } },
      });
      await this.calendarEvents.publishProject(projectId);
      return toMemberResponse(member);
    }

    try {
      const member = await this.prisma.projectMember.create({
        data: {
          id: crypto.randomUUID(),
          projectId,
          userId: dto.userId,
          role: ProjectRole.MEMBER,
          status: ProjectMemberStatus.ACTIVE,
          joinedAt: now,
          updatedAt: now,
        },
      });
      await this.calendarEvents.publishProject(projectId);
      return toMemberResponse(member);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException("User is already an active project member");
      }
      throw error;
    }
  }

  async updatePermissions(
    userId: string,
    projectId: string,
    memberUserId: string,
    dto: UpdateMemberPermissionsDto,
  ) {
    await this.access.requireOwner(userId, projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });

    if (!member || member.status !== ProjectMemberStatus.ACTIVE) {
      throw new NotFoundException("Project member not found");
    }
    if (member.role === ProjectRole.OWNER) {
      throw new ConflictException(
        "Project owner permissions cannot be changed",
      );
    }

    let updated;
    try {
      updated = await this.prisma.projectMember.update({
        where: { id: member.id, version: member.version },
        data: { ...dto, updatedAt: new Date(), version: { increment: 1 } },
      });
    } catch (error) {
      rethrowWriteConflict(
        error,
        "Project member was changed by another request",
      );
    }

    return toMemberResponse(updated);
  }

  async remove(
    userId: string,
    projectId: string,
    memberUserId: string,
  ): Promise<void> {
    await this.access.requireCanManageMembers(userId, projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });

    if (!member || member.status !== ProjectMemberStatus.ACTIVE) {
      throw new NotFoundException("Project member not found");
    }
    if (member.role === ProjectRole.OWNER) {
      throw new ConflictException("Project owner cannot be removed");
    }

    try {
      await this.prisma.projectMember.update({
        where: { id: member.id, version: member.version },
        data: {
          status: ProjectMemberStatus.LEFT,
          leftAt: new Date(),
          updatedAt: new Date(),
          version: { increment: 1 },
        },
      });
    } catch (error) {
      rethrowWriteConflict(
        error,
        "Project member was changed by another request",
      );
    }
    await this.calendarEvents.publishProject(projectId);
  }
}
