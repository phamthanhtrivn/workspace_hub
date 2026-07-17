import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, ConversationRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { ClientKafka } from '@nestjs/microservices';
import {
  KAFKA_TOPICS,
  KAFKA_EVENTS,
} from '../../common/constants/kafka.constants';
import { getSenderProfile } from '../../common/utils/user.util';
import { mapMediaWithUrl } from '../../common/utils/file.util';

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
    const conversations = await this.prisma.conversation.findMany({
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
          include: {
            medias: true,
            poll: true,
            note: true,
            replyTo: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return Promise.all(
      conversations.map(async (conv) => {
        const member = conv.members.find((m) => m.userId === userId);
        let unreadCount = 0;

        if (member) {
          const referenceDate = member.lastReadAt || member.joinedAt;
          unreadCount = await this.prisma.message.count({
            where: {
              conversationId: conv.id,
              createdAt: {
                gt: referenceDate,
              },
              senderId: {
                not: userId, // don't count own messages as unread
              },
            },
          });
        }

        return {
          ...conv,
          unreadCount,
        };
      }),
    );
  }

  async getConversationMessages(
    conversationId: string,
    cursor?: string,
    limit: number = 20,
    direction: 'older' | 'newer' | 'around' = 'older',
  ) {
    const includeQuery = {
      reactions: true,
      medias: true,
      poll: { include: { options: { include: { votes: true } } } },
      note: true,
      replyTo: true,
    };

    if (direction === 'older') {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: includeQuery,
      });

      let nextCursor: string | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages: messages.reverse().map((message) => ({
          ...message,
          medias: mapMediaWithUrl(message.medias),
        })),
        nextCursor,
      };
    } else if (direction === 'newer') {
      const messages = await this.prisma.message.findMany({
        where: { conversationId },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'asc' },
        include: includeQuery,
      });

      let prevCursor: string | undefined = undefined;
      if (messages.length > limit) {
        const prevItem = messages.pop();
        prevCursor = prevItem?.id;
      }

      return {
        messages: messages.map((message) => ({
          ...message,
          medias: mapMediaWithUrl(message.medias),
        })),
        prevCursor,
      };
    } else if (direction === 'around' && cursor) {
      const halfLimit = Math.floor(limit / 2);

      const [targetMessage, olderMessages, newerMessages] = await Promise.all([
        this.prisma.message.findUnique({
          where: { id: cursor },
          include: includeQuery,
        }),
        this.prisma.message.findMany({
          where: { conversationId },
          take: halfLimit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'desc' },
          include: includeQuery,
        }),
        this.prisma.message.findMany({
          where: { conversationId },
          take: halfLimit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'asc' },
          include: includeQuery,
        }),
      ]);

      let nextCursor: string | undefined = undefined;
      if (olderMessages.length > halfLimit) {
        const nextItem = olderMessages.pop();
        nextCursor = nextItem?.id;
      }

      let prevCursor: string | undefined = undefined;
      if (newerMessages.length > halfLimit) {
        const prevItem = newerMessages.pop();
        prevCursor = prevItem?.id;
      }

      const allMessages: typeof olderMessages = [];
      if (olderMessages.length > 0) {
        allMessages.push(...olderMessages.reverse());
      }
      if (targetMessage) {
        allMessages.push(targetMessage);
      }
      if (newerMessages.length > 0) {
        allMessages.push(...newerMessages);
      }

      return {
        messages: allMessages.map((message) => ({
          ...message,
          medias: mapMediaWithUrl(message.medias),
        })),
        nextCursor,
        prevCursor,
      };
    }

    return { messages: [], nextCursor: undefined, prevCursor: undefined };
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

    const conversation = await this.prisma.$transaction(async (prisma) => {
      return prisma.conversation.create({
        data: {
          type: ConversationType.GROUP,
          name: data.name || null,
          avatarUrl: data.avatarUrl || null,
          createdBy: userId,
          members: {
            create: members,
          },
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
          invitations: true,
        },
      });
    });

    await this.chatGateway.sendSystemMessage(
      conversation.id,
      userId,
      `${senderName} đã tạo nhóm`,
    );

    // Emit invitation events and notifications
    if (conversation.invitations) {
      conversation.invitations.forEach((inv) => {
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
  }

  async getConversationMedia(
    conversationId: string,
    cursor?: string,
    limit: number = 20,
  ) {
    const medias = await this.prisma.media.findMany({
      where: {
        message: {
          conversationId,
        },
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: {
        message: {
          createdAt: 'desc',
        },
      },
      include: {
        message: {
          select: {
            senderId: true,
            createdAt: true,
          },
        },
      },
    });

    let nextCursor: string | undefined = undefined;
    if (medias.length > limit) {
      const nextItem = medias.pop();
      nextCursor = nextItem?.id;
    }

    return {
      medias: mapMediaWithUrl(medias),
      nextCursor,
    };
  }

  async getPinnedMessages(conversationId: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        pinned: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        replyTo: true,
      },
    });

    return messages.map((message) => ({
      ...message,
      medias: mapMediaWithUrl(message.medias),
    }));
  }
}
