import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType, Prisma } from '@prisma/client';

@Injectable()
export class MessageService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(
    conversationId: string,
    senderId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
    medias?: {
      name: string;
      s3Key: string;
      mimeType: string;
      sizeBytes: number;
    }[],
    pollData?: {
      title: string;
      multipleChoice?: boolean;
      allowAddOptions?: boolean;
      anonymous?: boolean;
      options: string[];
    },
    noteData?: {
      title: string;
      content: string;
    },
    replyToMessageId?: string,
  ): Promise<
    Prisma.MessageGetPayload<{
      include: {
        medias: true;
        poll: { include: { options: true } };
        note: true;
        replyTo: true;
      };
    }>
  > {
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          conversationId,
          senderId,
          content,
          type,
          replyToMessageId,
          medias:
            medias && medias.length > 0
              ? {
                  create: medias.map((m) => {
                    let mediaType = 'FILE';
                    if (m.mimeType.startsWith('image/')) mediaType = 'IMAGE';
                    else if (m.mimeType.startsWith('video/'))
                      mediaType = 'VIDEO';

                    return {
                      name: m.name,
                      s3Key: m.s3Key,
                      mimeType: m.mimeType,
                      sizeBytes: m.sizeBytes,
                      type: mediaType as any,
                    };
                  }),
                }
              : undefined,
          poll:
            type === MessageType.POLL && pollData
              ? {
                  create: {
                    title: pollData.title,
                    multipleChoice: pollData.multipleChoice ?? true,
                    allowAddOptions: pollData.allowAddOptions ?? true,
                    anonymous: pollData.anonymous ?? false,
                    createdBy: senderId,
                    options: {
                      create: pollData.options.map((opt: string) => ({
                        text: opt,
                      })),
                    },
                  },
                }
              : undefined,
          note:
            type === MessageType.NOTE && noteData
              ? {
                  create: {
                    title: noteData.title,
                    content: noteData.content,
                    createdBy: senderId,
                  },
                }
              : undefined,
        },
        include: {
          medias: true,
          poll: { include: { options: { include: { votes: true } } } },
          note: true,
          replyTo: true,
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await tx.conversationMember.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId: senderId,
          },
        },
        data: {
          lastReadMessageId: message.id,
          lastReadAt: new Date(),
        },
      });

      return message;
    });
  }

  async getConversationMemberIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const existing = await this.prisma.reaction.findFirst({
      where: { messageId, userId },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        // Toggle off
        await this.prisma.reaction.delete({ where: { id: existing.id } });
        return { action: 'remove', emoji };
      } else {
        // Update emoji
        await this.prisma.reaction.update({
          where: { id: existing.id },
          data: { emoji },
        });
        return { action: 'update', emoji };
      }
    } else {
      // Create new
      await this.prisma.reaction.create({
        data: { messageId, userId, emoji },
      });
      return { action: 'add', emoji };
    }
  }

  async removeReaction(messageId: string, userId: string, emoji: string) {
    return this.prisma.reaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  async markConversationAsRead(
    conversationId: string,
    userId: string,
    messageId: string,
  ) {
    return this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadMessageId: messageId,
        lastReadAt: new Date(),
      },
    });
  }
}
