import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ProjectMemberStatus, ProjectRole } from "../project/project.enums";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AddMemberDto } from "./dto/add-member.dto";
import { UpdateMemberPermissionsDto } from "./dto/update-member-permissions.dto";
import { ProjectAccessService } from "../project/project-access.service";
import { toMemberResponse } from "../project/project.mapper";
import { TaskCalendarEventService } from "../notification-outbox/task-calendar-event.service";
import {
  isUniqueConstraintError,
  rethrowWriteConflict,
} from "../../common/prisma/prisma-errors";
import { defaultMemberPermissions } from "./member-permissions";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly calendarEvents: TaskCalendarEventService,
    private readonly userProfiles: UserProfileSnapshotService,
  ) {}

  async add(userId: string, projectId: string, dto: AddMemberDto) {
    const project = await this.access.requireOwnerWriteAccess(userId, projectId);
    const permissions = defaultMemberPermissions(project.setting);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const reactivated = await tx.projectMember.updateMany({
        where: {
          projectId,
          userId: dto.userId,
          status: { not: ProjectMemberStatus.ACTIVE },
        },
        data: {
          role: ProjectRole.MEMBER,
          status: ProjectMemberStatus.ACTIVE,
          ...permissions,
          leftAt: null,
          updatedAt: now,
          version: { increment: 1 },
        },
      });
      if (reactivated.count === 1) {
        const member = await tx.projectMember.findUniqueOrThrow({
          where: { projectId_userId: { projectId, userId: dto.userId } },
        });
        await this.calendarEvents.publishProject(projectId, tx);
        const profile = await this.userProfiles.getProfileByUserId(dto.userId);
        return toMemberResponse(member, profile);
      }

      try {
        const member = await tx.projectMember.create({
          data: {
            id: crypto.randomUUID(),
            projectId,
            userId: dto.userId,
            role: ProjectRole.MEMBER,
            status: ProjectMemberStatus.ACTIVE,
            ...permissions,
            joinedAt: now,
            updatedAt: now,
          },
        });
        await this.calendarEvents.publishProject(projectId, tx);
        const profile = await this.userProfiles.getProfileByUserId(dto.userId);
        return toMemberResponse(member, profile);
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw new ConflictException(
            "User is already an active project member",
          );
        }
        throw error;
      }
    });
  }

  async updatePermissions(
    userId: string,
    projectId: string,
    memberUserId: string,
    dto: UpdateMemberPermissionsDto,
  ) {
    await this.access.requireOwnerWriteAccess(userId, projectId);
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
    });

    if (!member || member.status !== ProjectMemberStatus.ACTIVE) {
      throw new NotFoundException("Project member not found");
    }
    if (member.role === ProjectRole.ADMIN) {
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

    const profile = await this.userProfiles.getProfileByUserId(memberUserId);
    return toMemberResponse(updated, profile);
  }

  async remove(
    userId: string,
    projectId: string,
    memberUserId: string,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      await this.access.requireCanManageMembers(userId, projectId);
      const member = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: memberUserId } },
      });

      if (!member || member.status !== ProjectMemberStatus.ACTIVE) {
        throw new NotFoundException("Project member not found");
      }
      if (member.role === ProjectRole.ADMIN) {
        throw new ConflictException("Project owner cannot be removed");
      }

      try {
        await tx.projectMember.update({
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
      await this.calendarEvents.publishProject(projectId, tx);
    });
  }
}
