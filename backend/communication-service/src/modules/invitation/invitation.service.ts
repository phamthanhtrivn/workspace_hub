import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationRole, MessageType } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatEvent } from '../chat/chat.events';
import { MessageService } from '../message/message.service';
import { ClientKafka } from '@nestjs/microservices';
import {
  KAFKA_TOPICS,
  KAFKA_EVENTS,
} from '../../common/constants/kafka.constants';
import { getSenderProfile } from '../../common/utils/user.util';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
    private readonly chatGateway: ChatGateway,
    private readonly messageService: MessageService,
  ) {}

  async getPendingInvitations(userId: string) {
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
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: { conversation: true },
    });

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    if (invitation.invitedUserId !== userId) {
      throw new BadRequestException(
        'Bạn không có quyền thao tác với lời mời này',
      );
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Lời mời này đã được xử lý');
    }

    const { senderName, senderAvatar } = await getSenderProfile(userId);

    return this.prisma.$transaction(async (prisma) => {
      const updatedInvitation = await prisma.groupInvitation.update({
        where: { id: invitationId },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      });

      await prisma.conversationMember.create({
        data: {
          conversationId: invitation.conversationId,
          userId: userId,
          role: ConversationRole.MEMBER,
        },
      });

      await this.chatGateway.sendSystemMessage(
        invitation.conversationId,
        userId,
        `${senderName} đã tham gia vào nhóm chat`
      );

      const memberUserIds = await this.messageService.getConversationMemberIds(
        invitation.conversationId,
      );
      const targetRooms = [invitation.conversationId, ...memberUserIds];
      
      this.chatGateway.emitMemberJoin(targetRooms, {
        conversationId: invitation.conversationId,
        member: {
          conversationId: invitation.conversationId,
          userId: userId,
          role: ConversationRole.MEMBER,
        },
        profile: {
          id: userId,
          fullName: senderName,
          avatarUrl: senderAvatar,
        },
      });

      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: invitation.invitedBy,
        value: {
          recipientId: invitation.invitedBy,
          senderId: userId,
          senderName: senderName,
          senderAvatar: senderAvatar,
          type: KAFKA_EVENTS.NOTIFICATION.CHAT_INVITATION_ACCEPTED,
          title: 'Lời mời đã được chấp nhận',
          content: 'Chấp nhận lời mời vào nhóm',
          link: `/chat?id=${invitation.conversationId}`,
          metadata: {
            conversationId: invitation.conversationId,
            conversationName: invitation.conversation.name,
          },
        },
      });

      return updatedInvitation;
    });
  }

  async declineInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
      include: { conversation: true },
    });

    if (!invitation) {
      throw new NotFoundException('Không tìm thấy lời mời');
    }

    if (invitation.invitedUserId !== userId) {
      throw new BadRequestException(
        'Bạn không có quyền thao tác với lời mời này',
      );
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Lời mời này đã được xử lý');
    }

    const { senderName, senderAvatar } = await getSenderProfile(userId);

    const updatedInvitation = await this.prisma.groupInvitation.update({
      where: { id: invitationId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
      },
    });

    this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
      key: invitation.invitedBy,
      value: {
        recipientId: invitation.invitedBy,
        senderId: userId,
        senderName: senderName,
        senderAvatar: senderAvatar,
        type: KAFKA_EVENTS.NOTIFICATION.CHAT_INVITATION_DECLINED,
        title: 'Lời mời bị từ chối',
        content: 'Từ chối lời mời vào nhóm',
        link: `/chat`,
        metadata: {
          conversationId: invitation.conversationId,
          conversationName: invitation.conversation?.name,
        },
      },
    });

    return updatedInvitation;
  }
}
