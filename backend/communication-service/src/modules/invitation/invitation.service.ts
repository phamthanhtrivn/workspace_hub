import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatEvent } from '../chat/chat.events';
import { ClientKafka } from '@nestjs/microservices';
import {
  KAFKA_TOPICS,
  KAFKA_EVENTS,
} from '../../common/constants/kafka.constants';

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
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

      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: invitation.invitedBy,
        value: {
          recipientId: invitation.invitedBy,
          senderId: userId,
          type: KAFKA_EVENTS.NOTIFICATION.CHAT_INVITATION_ACCEPTED,
          title: 'Lời mời đã được chấp nhận',
          content: 'Chấp nhận lời mời vào nhóm',
          link: `/chat?id=${invitation.conversationId}`,
        },
      });

      return updatedInvitation;
    });
  }

  async declineInvitation(userId: string, invitationId: string) {
    const invitation = await this.prisma.groupInvitation.findUnique({
      where: { id: invitationId },
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
        type: KAFKA_EVENTS.NOTIFICATION.CHAT_INVITATION_DECLINED,
        title: 'Lời mời bị từ chối',
        content: 'Từ chối lời mời vào nhóm',
        link: `/chat`,
      },
    });

    return updatedInvitation;
  }
}
