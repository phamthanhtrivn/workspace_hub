import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType, Prisma } from '@prisma/client';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

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

  async editMessage(messageId: string, content: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Không tìm thấy tin nhắn');
    }

    if (message.senderId !== userId) {
      throw new Error('Bạn chỉ có thể chỉnh sửa tin nhắn của chính mình');
    }

    if (message.type !== MessageType.TEXT) {
      throw new Error('Chỉ có tin nhắn văn bản mới có thể chỉnh sửa');
    }

    if (content.trim().length === 0) {
      throw new Error('Nội dung tin nhắn không được để trống');
    }

    const now = new Date().getTime();
    const createdAt = new Date(message.createdAt).getTime();
    const hoursDifference = (now - createdAt) / (1000 * 60 * 60);

    if (hoursDifference > 24) {
      throw new Error('Tin nhắn chỉ có thể sửa trong vòng 24 tiếng');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        edited: true,
      },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        replyTo: true,
      },
    });
  }

  async recallMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { medias: true },
    });

    if (!message) {
      throw new Error('Tin nhắn không tìm thấy');
    }

    if (message.senderId !== userId) {
      throw new Error('Bạn chỉ có thể thu hồi tin nhắn của chính mình');
    }

    const now = new Date();
    const createdAt = new Date(message.createdAt);
    if (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
      throw new Error('Chỉ có thể thu hồi tin nhắn trong vòng 24 giờ');
    }

    // Delete medias from S3
    if (message.medias && message.medias.length > 0) {
      for (const media of message.medias) {
        if (media.s3Key) {
          await this.s3Service.deleteFile(media.s3Key);
        }
      }

      // Delete media records from DB
      await this.prisma.media.deleteMany({
        where: { messageId },
      });
    }

    // Mark message as recalled, clear content
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        recalled: true,
        content: null,
      },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        replyTo: true,
      },
    });
  }

  async pinMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Tin nhắn không tìm thấy');
    }

    if (message.pinned) {
      throw new Error('Tin nhắn đã được ghim');
    }

    const pinnedCount = await this.prisma.message.count({
      where: {
        conversationId: message.conversationId,
        pinned: true,
      },
    });

    if (pinnedCount >= 3) {
      throw new Error('Chỉ được ghim tối đa 3 tin nhắn');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { pinned: true },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        replyTo: true,
      },
    });
  }

  async unpinMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Tin nhắn không tìm thấy');
    }

    if (!message.pinned) {
      throw new Error('Tin nhắn chưa được ghim');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { pinned: false },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        replyTo: true,
      },
    });
  }

  async getPinnedMessages(conversationId: string) {
    return this.prisma.message.findMany({
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
  }
}
