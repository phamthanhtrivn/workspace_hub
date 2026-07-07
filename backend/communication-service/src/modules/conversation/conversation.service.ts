import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, ConversationRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatEvent } from '../chat/chat.events';
import { ClientKafka } from '@nestjs/microservices';
import {
  KAFKA_TOPICS,
  KAFKA_EVENTS,
} from '../../common/constants/kafka.constants';
import { getSenderProfile } from '../../common/utils/user.util';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  async createDirectConversation(userId: string, participantId: string) {
    if (userId === participantId) {
      throw new BadRequestException(
        'Không thể tạo cuộc trò chuyện với chính mình',
      );
    }

    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        AND: [
          {
            members: {
              some: {
                userId: userId,
              },
            },
          },
          {
            members: {
              some: {
                userId: participantId,
              },
            },
          },
        ],
      },
      include: {
        members: true,
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    return this.prisma.$transaction(async (prisma) => {
      const conversation = await prisma.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          createdBy: userId,
          members: {
            create: [
              {
                userId: userId,
                role: ConversationRole.MEMBER,
              },
              {
                userId: participantId,
                role: ConversationRole.MEMBER,
              },
            ],
          },
          setting: {
            create: {
              allowMemberInvite: false,
              approvalRequired: false,
              allowSendMessage: true,
              allowCreateNote: true,
              allowCreatePoll: true,
              allowPinMessage: true,
            },
          },
        },
        include: {
          members: true,
        },
      });

      return conversation;
    });
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
        OR: [
          {
            type: {
              not: ConversationType.DIRECT,
            },
          },
          {
            createdBy: userId,
          },
          {
            messages: {
              some: {},
            },
          },
        ],
      },
      include: {
        setting: true,
        members: true,
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async getConversationMessages(conversationId: string) {
    return this.prisma.message.findMany({
      where: {
        conversationId: conversationId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        reactions: true,
        attachments: true,
      },
    });
  }

  async createGroupConversation(
    userId: string,
    data: { name?: string; avatarUrl?: string; participantIds: string[] },
  ) {
    const { senderName, senderAvatar } = await getSenderProfile(userId);
    const otherParticipantIds = data.participantIds.filter(
      (id) => id !== userId,
    );

    const members = [{ userId: userId, role: ConversationRole.OWNER }];

    const invitations = otherParticipantIds.map((id) => ({
      invitedUserId: id,
      invitedBy: userId,
      status: 'PENDING' as const,
    }));

    return this.prisma.$transaction(async (prisma) => {
      const conversation = await prisma.conversation.create({
        data: {
          type: ConversationType.GROUP,
          name: data.name || null,
          avatarUrl: data.avatarUrl || null,
          createdBy: userId,
          members: {
            create: members,
          },
          // @ts-ignore - Prisma client needs to be regenerated
          invitations: {
            create: invitations,
          },
          setting: {
            create: {
              allowMemberInvite: true,
              approvalRequired: false,
              allowSendMessage: true,
              allowCreateNote: true,
              allowCreatePoll: true,
              allowPinMessage: true,
            },
          },
        },
        include: {
          members: true,
          // @ts-ignore - Prisma client needs to be regenerated
          invitations: true,
        },
      });

      // Emit invitation events and notifications
      if ((conversation as any).invitations) {
        (conversation as any).invitations.forEach((inv: any) => {
          // Publish to notification-service ONLY, no chat websocket
          this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
            key: inv.invitedUserId,
            value: {
              recipientId: inv.invitedUserId,
              senderId: userId,
              senderName: senderName,
              senderAvatar: senderAvatar,
              type: KAFKA_EVENTS.NOTIFICATION.CHAT_GROUP_INVITATION,
              title: 'Lời mời vào nhóm chat',
              content: `Bạn được mời vào nhóm chat ${conversation.name || 'mới'}`,
              link: '/chat',
              metadata: {
                invitationId: inv.id,
                conversationId: conversation.id,
                conversationName: conversation.name,
                conversationAvatarUrl: conversation.avatarUrl,
              },
            },
          });
        });
      }

      return conversation;
    });
  }
}
