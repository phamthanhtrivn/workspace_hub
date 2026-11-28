import { enqueueProjectAccessSync } from "../project/project-access-sync";
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
import { ProjectService } from "../project/project.service";
import { toMemberResponse } from "../project/project.mapper";
import {
  isUniqueConstraintError,
  rethrowWriteConflict,
} from "../../common/prisma/prisma-errors";
import { defaultMemberPermissions } from "./member-permissions";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";
import { NotificationOutboxService } from '../notification-outbox/notification-outbox.service';
import { KAFKA_EVENTS } from '../../common/constants/kafka.constants';
import { PROJECT_PERMISSION_LABELS, projectNotificationIdentity } from '../../common/utils/project-notification.util';

@Injectable()
export class MemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ProjectAccessService,
    private readonly userProfiles: UserProfileSnapshotService,
    private readonly projects: ProjectService,
    private readonly notifications: NotificationOutboxService,
  ) {}

  async add(userId: string, projectId: string, dto: AddMemberDto) {
    const project = await this.access.requireOwnerWriteAccess(userId, projectId);
    const permissions = defaultMemberPermissions(project.setting);
    const now = new Date();
    const memberResponse = await this.prisma.$transaction(async (tx) => {
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
        const profile = await this.userProfiles.getProfileByUserId(dto.userId);
        await enqueueProjectAccessSync(tx, projectId);
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
        const profile = await this.userProfiles.getProfileByUserId(dto.userId);
        await enqueueProjectAccessSync(tx, projectId);
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

    return memberResponse;
  }

  async updatePermissions(
    userId: string,
    projectId: string,
    memberUserId: string,
    dto: UpdateMemberPermissionsDto,
  ) {
    const project = await this.access.requireOwnerWriteAccess(userId, projectId);
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
      updated = await this.prisma.$transaction(async tx => {
        const result = await tx.projectMember.update({
        where: { id: member.id, version: member.version },
        data: { ...dto, updatedAt: new Date(), version: { increment: 1 } },
        });
        const changes = (Object.keys(PROJECT_PERMISSION_LABELS) as Array<keyof UpdateMemberPermissionsDto>)
          .filter((field) => member[field] !== result[field])
          .map((field) => ({ field, label: PROJECT_PERMISSION_LABELS[field], before: member[field], after: result[field] }));
        if (changes.length) await this.notifications.enqueueNotification({
          recipientId: memberUserId, senderId: userId,
          type: KAFKA_EVENTS.NOTIFICATION.PROJECT_PERMISSIONS_UPDATED,
          title: 'Your project permissions changed',
          content: `Your permissions in project "${project.name}" were updated.`,
          link: `/projects/${projectId}`,
          metadata: { ...projectNotificationIdentity(project), changes },
        }, tx);
        await enqueueProjectAccessSync(tx, projectId);
        return result;
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
    await this.prisma.$transaction(async (tx) => {
      await this.access.requireCanManageMembers(userId, projectId);
      const project = await tx.project.findUniqueOrThrow({ where: { id: projectId } });
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
        await tx.taskAssignee.deleteMany({ where: { projectId, userId: memberUserId } });
        await this.notifications.enqueueNotification({
          recipientId: memberUserId, senderId: userId,
          type: KAFKA_EVENTS.NOTIFICATION.PROJECT_MEMBER_REMOVED,
          title: 'You were removed from a project',
          content: `You were removed from project "${project.name}". You no longer have access to this project.`,
          metadata: { ...projectNotificationIdentity(project), removedAt: new Date().toISOString() },
        }, tx);
        await enqueueProjectAccessSync(tx, projectId);
      } catch (error) {
        rethrowWriteConflict(
          error,
          "Project member was changed by another request",
        );
      }
    });

  }
}
