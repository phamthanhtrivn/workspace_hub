import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpaceRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { MessageService } from '../message/message.service';
import { INVITATION_STATUS } from './types/invitation.enums';
import { InvitationPublisher } from './events/invitation.publisher';
import { UserProfileSnapshot } from 'src/common/types/user.types';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationPublisher: InvitationPublisher,
    private readonly chatGateway: ChatGateway,
    private readonly messageService: MessageService,
  ) {}

  async getPendingInvitations(userId: string) {
    const invitations = await this.prisma.spaceInvitation.findMany({
      where: {
        invitedUserId: userId,
        status: INVITATION_STATUS.PENDING,
      },
      include: {
        space: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invitations.map((invitation) => ({
      ...invitation,
      inviter: {
        userId: invitation.invitedBy,
        fullName: invitation.invitedByName,
        avatarUrl: invitation.invitedByAvatar,
      },
      invitee: {
        userId: invitation.invitedUserId,
        fullName: invitation.invitedUserName,
        avatarUrl: invitation.invitedUserAvatar,
      },
    }));
  }

  async acceptInvitation(
    userId: string,
    invitationId: string,
    responderSnapshot: UserProfileSnapshot,
  ) {
    const invitation = await this.prisma.spaceInvitation.findUnique({
      where: { id: invitationId },
      include: { space: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedUserId !== userId) {
      throw new BadRequestException(
        'You are not allowed to respond to this invitation',
      );
    }

    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new BadRequestException('This invitation has already been handled');
    }

    const updatedInvitation = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.spaceInvitation.update({
        where: { id: invitationId },
        data: {
          status: INVITATION_STATUS.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      await prisma.spaceMember.upsert({
        where: {
          spaceId_userId: {
            spaceId: invitation.spaceId,
            userId,
          },
        },
        update: {},
        create: {
          spaceId: invitation.spaceId,
          userId,
          role: SpaceRole.MEMBER,
        },
      });

      const channels = await prisma.channel.findMany({
        where: { spaceId: invitation.spaceId, isDefault: true },
      });

      await prisma.channelMember.createMany({
        data: channels.map((channel) => ({
          channelId: channel.id,
          userId,
        })),
        skipDuplicates: true,
      });

      return updated;
    });

    const spaceChannels = await this.prisma.channel.findMany({
      where: { spaceId: invitation.spaceId, isDefault: true },
    });

    for (const channel of spaceChannels) {
      await this.chatGateway.sendSystemMessage(
        channel.id,
        userId,
        `${responderSnapshot.fullName || userId} joined the chat channel`,
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        channel.id,
      );
      const targetRooms = [channel.id, ...memberUserIds];

      this.chatGateway.emitMemberJoin(targetRooms, {
        channelId: channel.id,
        member: {
          channelId: channel.id,
          userId,
          role: SpaceRole.MEMBER,
        },
      });
    }

    this.conversationPublisher.publishInvitationAccepted(
      invitation.invitedBy,
      userId,
      responderSnapshot.fullName,
      responderSnapshot.avatarUrl,
      invitation.spaceId,
      invitation.space.name,
    );

    return updatedInvitation;
  }

  async declineInvitation(
    userId: string,
    invitationId: string,
    responderSnapshot: UserProfileSnapshot,
  ) {
    const invitation = await this.prisma.spaceInvitation.findUnique({
      where: { id: invitationId },
      include: { space: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.invitedUserId !== userId) {
      throw new BadRequestException(
        'You are not allowed to respond to this invitation',
      );
    }

    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new BadRequestException('This invitation has already been handled');
    }

    const updatedInvitation = await this.prisma.spaceInvitation.update({
      where: { id: invitationId },
      data: {
        status: INVITATION_STATUS.DECLINED,
        respondedAt: new Date(),
      },
    });

    this.conversationPublisher.publishInvitationDeclined(
      invitation.invitedBy,
      userId,
      responderSnapshot.fullName,
      responderSnapshot.avatarUrl,
      invitation.spaceId,
      invitation.space?.name,
    );

    return updatedInvitation;
  }
}
