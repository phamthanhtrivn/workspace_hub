import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpaceRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { MessageService } from '../message/message.service';
import { getSenderProfile } from '../../common/utils/user.util';
import { INVITATION_STATUS } from './types/invitation.enums';
import { InvitationPublisher } from './events/invitation.publisher';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationPublisher: InvitationPublisher,
    private readonly chatGateway: ChatGateway,
    private readonly messageService: MessageService,
  ) {}

  async getPendingInvitations(userId: string) {
    return this.prisma.spaceInvitation.findMany({
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
  }

  async acceptInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.spaceInvitation.findUnique({
      where: { id: invitationId },
      include: { space: true },
    });

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    if (invitation.invitedUserId !== userId) {
      throw new BadRequestException(
        'Bạn không có quyền thao tác với lời mời này',
      );
    }

    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new BadRequestException('Lời mời này đã được xử lý');
    }

    const { senderName, senderAvatar } = await getSenderProfile(userId);

    const updatedInvitation = await this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.spaceInvitation.update({
        where: { id: invitationId },
        data: {
          status: INVITATION_STATUS.ACCEPTED,
          respondedAt: new Date(),
        },
      });

      await prisma.spaceMember.create({
        data: {
          spaceId: invitation.spaceId,
          userId,
          role: SpaceRole.MEMBER,
        },
      });

      const channels = await prisma.channel.findMany({
        where: { spaceId: invitation.spaceId },
      });

      for (const channel of channels) {
        await prisma.channelMember.create({
          data: {
            channelId: channel.id,
            userId,
          },
        });
      }

      return updated;
    });

    const spaceChannels = await this.prisma.channel.findMany({
      where: { spaceId: invitation.spaceId },
    });

    for (const channel of spaceChannels) {
      await this.chatGateway.sendSystemMessage(
        channel.id,
        userId,
        `${senderName} đã tham gia vào kênh chat`,
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
        },
        profile: {
          id: userId,
          fullName: senderName,
          avatarUrl: senderAvatar,
        },
      });
    }

    this.conversationPublisher.publishInvitationAccepted(
      invitation.invitedBy,
      userId,
      senderName,
      senderAvatar,
      invitation.spaceId,
      invitation.space.name,
    );

    return updatedInvitation;
  }

  async declineInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.spaceInvitation.findUnique({
      where: { id: invitationId },
      include: { space: true },
    });

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    if (invitation.invitedUserId !== userId) {
      throw new BadRequestException(
        'Bạn không có quyền thao tác với lời mời này',
      );
    }

    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new BadRequestException('Lời mời này đã được xử lý');
    }

    const { senderName, senderAvatar } = await getSenderProfile(userId);

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
      senderName,
      senderAvatar,
      invitation.spaceId,
      invitation.space?.name,
    );

    return updatedInvitation;
  }
}
