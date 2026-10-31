import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvitationStatus, SpaceRole } from '@prisma/client';
import { InviteSpaceMemberDto } from './dto/invite-space-members.dto';
import { UserProfileSnapshot } from '../../common/types/user.types';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { SPACE_ERROR_MESSAGES } from './types/space.enums';
import { SpaceAccessService } from './space-access.service';
import { SpaceEventPublisher } from './space-event-publisher.service';

@Injectable()
export class SpaceInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly access: SpaceAccessService,
    private readonly events: SpaceEventPublisher,
  ) {}
  async getSpaceInvitations(userId: string, spaceId: string) {
    await this.access.assertSpaceAdmin(spaceId, userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { projectId: true },
    });
    if (space?.projectId) return [];

    const invitations = await this.prisma.spaceInvitation.findMany({
      where: { spaceId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
    return this.userProfileSnapshotService.attachProfilesToInvitations(
      invitations,
    );
  }

  async cancelSpaceInvitation(
    userId: string,
    spaceId: string,
    invitationId: string,
  ) {
    await this.access.assertSpaceAdmin(spaceId, userId);
    await this.access.assertNotProjectSpace(spaceId);
    const invitation = await this.prisma.spaceInvitation.findFirst({
      where: { id: invitationId, spaceId },
    });
    if (!invitation) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.INVITATION_NOT_FOUND);
    }

    await this.prisma.spaceInvitation.delete({ where: { id: invitationId } });
    return { success: true };
  }

  async resendSpaceInvitation(
    userId: string,
    spaceId: string,
    invitationId: string,
  ) {
    await this.access.assertSpaceAdmin(spaceId, userId);
    await this.access.assertNotProjectSpace(spaceId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    });
    const existingInvitation = await this.prisma.spaceInvitation.findFirst({
      where: { id: invitationId, spaceId },
    });
    if (!existingInvitation) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.INVITATION_NOT_FOUND);
    }
    const invitation = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.spaceInvitation.update({
        where: { id: invitationId },
        data: {
          invitedBy: userId,
          status: InvitationStatus.PENDING,
          respondedAt: null,
          createdAt: new Date(),
        },
      });
      await this.events.emitSpaceInvitation(
        updated,
        space?.name,
        undefined,
        tx,
      );
      return updated;
    });
    const [enrichedInvitation] =
      await this.userProfileSnapshotService.attachProfilesToInvitations([
        invitation,
      ]);
    return enrichedInvitation;
  }

  async inviteMembersToSpace(
    userId: string,
    spaceId: string,
    invitees: InviteSpaceMemberDto[],
    invitedBySnapshot: UserProfileSnapshot,
  ) {
    await this.access.assertNotProjectSpace(spaceId);
    const requester = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!requester || requester.role === SpaceRole.MEMBER) {
      throw new BadRequestException(
        'You are not allowed to invite members to this space',
      );
    }

    if (!invitees || invitees.length === 0) {
      return { count: 0 };
    }

    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const invitationsToNotify: {
        userId: string;
        invitationId: string;
      }[] = [];
      const alreadyMembers: string[] = [];
      const alreadyPending: string[] = [];
      for (const invitee of invitees) {
        const invitedId = invitee.userId;
        if (!invitedId || invitedId === userId) {
          continue;
        }

        const exists = await tx.spaceMember.findUnique({
          where: {
            spaceId_userId: {
              spaceId,
              userId: invitedId,
            },
          },
        });

        if (exists) {
          alreadyMembers.push(invitedId);
          continue;
        }

        const existingInvitation = await tx.spaceInvitation.findUnique({
          where: {
            spaceId_invitedUserId: {
              spaceId,
              invitedUserId: invitedId,
            },
          },
        });

        if (existingInvitation?.status === InvitationStatus.PENDING) {
          alreadyPending.push(invitedId);
          continue;
        }

        if (existingInvitation) {
          const invitation = await tx.spaceInvitation.update({
            where: { id: existingInvitation.id },
            data: {
              invitedBy: userId,
              status: InvitationStatus.PENDING,
              respondedAt: null,
            },
          });
          invitationsToNotify.push({
            userId: invitedId,
            invitationId: invitation.id,
          });
        } else {
          const invitation = await tx.spaceInvitation.create({
            data: {
              spaceId,
              invitedUserId: invitedId,
              invitedBy: userId,
            },
          });
          invitationsToNotify.push({
            userId: invitedId,
            invitationId: invitation.id,
          });
        }
      }

      await Promise.all(
        invitationsToNotify.map((invitation) =>
          this.events.emitSpaceInvitation(
            {
              id: invitation.invitationId,
              spaceId,
              invitedUserId: invitation.userId,
              invitedBy: userId,
            },
            space?.name,
            invitedBySnapshot,
            tx,
          ),
        ),
      );

      return {
        count: invitationsToNotify.length,
        invitationsToNotify,
        alreadyMemberCount: alreadyMembers.length,
        pendingCount: alreadyPending.length,
      };
    });
  }
}
