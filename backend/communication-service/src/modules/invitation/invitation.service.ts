import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatEvent } from '../chat/chat.events';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async getPendingInvitations(userId: string) {
    // @ts-ignore - Prisma client needs to be regenerated
    return this.prisma.groupInvitation.findMany({
      where: {
        invitedUserId: userId,
        status: 'PENDING',
      },
      include: {
        conversation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async acceptInvitation(userId: string, invitationId: string) {
    // @ts-ignore
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: { conversation: true }
    });

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    if (invitation.invitedUserId !== userId) {
      throw new BadRequestException('Bạn không có quyền thao tác với lời mời này');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Lời mời này đã được xử lý');
    }

    return this.prisma.$transaction(async (prisma) => {
      // 1. Update status
      // @ts-ignore
      const updatedInvitation = await prisma.groupInvitation.update({
        where: { id: invitationId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      // 2. Add to conversation members
      await prisma.conversationMember.create({
        data: {
          conversationId: invitation.conversationId,
          userId: userId,
          role: ConversationRole.MEMBER,
        },
      });

      // 3. Emit socket event to creator and others
      this.chatGateway.server.to(invitation.conversationId).emit(ChatEvent.INVITATION_ACCEPTED, {
        conversationId: invitation.conversationId,
        userId: userId,
        invitationId: invitation.id,
      });

      return updatedInvitation;
    });
  }

  async declineInvitation(userId: string, invitationId: string) {
    // @ts-ignore
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    if (invitation.invitedUserId !== userId) {
      throw new BadRequestException('Bạn không có quyền thao tác với lời mời này');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Lời mời này đã được xử lý');
    }

    // @ts-ignore
    const updatedInvitation = await this.prisma.groupInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
      },
    });

    // Emit event to creator
    this.chatGateway.server.to(invitation.invitedBy).emit(ChatEvent.INVITATION_DECLINED, {
      conversationId: invitation.conversationId,
      userId: userId,
      invitationId: invitation.id,
    });

    return updatedInvitation;
  }
}
