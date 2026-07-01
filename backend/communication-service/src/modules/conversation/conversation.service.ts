import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, ConversationRole } from '@prisma/client';

@Injectable()
export class ConversationService {
  constructor(private readonly prisma: PrismaService) {}

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
}
