import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getMediaType, mapMediaWithUrl } from 'src/common/utils/file.util';
import {
  MESSAGE_CONSTANTS,
  MESSAGE_DIRECTION,
  MESSAGE_ERROR_MESSAGES,
} from '../message/types/message.enums';

@Injectable()
export class DirectMessageService {
  constructor(private readonly prisma: PrismaService) {}

  async createDirectMessage(
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
    threadParentId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const participant = await tx.directConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: senderId,
          },
        },
      });

      if (!participant) {
        throw new BadRequestException(
          MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CONVERSATION,
        );
      }

      if (threadParentId) {
        const parentMessage = await tx.directMessage.findUnique({
          where: { id: threadParentId },
        });

        if (!parentMessage || parentMessage.conversationId !== conversationId) {
          throw new BadRequestException(MESSAGE_ERROR_MESSAGES.PARENT_NOT_FOUND);
        }

        await tx.directMessage.update({
          where: { id: threadParentId },
          data: {
            threadReplyCount: { increment: 1 },
            threadLastReplyAt: new Date(),
          },
        });

        await tx.directThreadFollower.upsert({
          where: {
            messageId_userId: {
              messageId: threadParentId,
              userId: parentMessage.senderId,
            },
          },
          update: {},
          create: {
            messageId: threadParentId,
            userId: parentMessage.senderId,
          },
        });

        await tx.directThreadFollower.upsert({
          where: {
            messageId_userId: {
              messageId: threadParentId,
              userId: senderId,
            },
          },
          update: {},
          create: {
            messageId: threadParentId,
            userId: senderId,
          },
        });
      }

      const message = await tx.directMessage.create({
        data: {
          conversationId,
          senderId,
          content,
          type: type || MessageType.TEXT,
          threadParentId,
          medias:
            medias && medias.length > 0
              ? {
                  create: medias.map((media) => ({
                    name: media.name,
                    s3Key: media.s3Key,
                    mimeType: media.mimeType,
                    sizeBytes: media.sizeBytes,
                    type: getMediaType(media.mimeType),
                  })),
                }
              : undefined,
        },
        include: {
          medias: true,
          replyTo: true,
          threadFollowers: true,
        },
      });

      await tx.directConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await tx.directConversationParticipant.update({
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

      return this.mapDirectMessage(message);
    });
  }

  async getDirectConversationMessages(
    conversationId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    direction: MESSAGE_DIRECTION = MESSAGE_DIRECTION.OLDER,
  ) {
    const includeQuery = {
      medias: true,
      replyTo: true,
      threadFollowers: true,
    };

    if (direction === MESSAGE_DIRECTION.OLDER) {
      const messages = await this.prisma.directMessage.findMany({
        where: { conversationId, threadParentId: null },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'desc' },
        include: includeQuery,
      });

      let nextCursor: string | undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages: messages.reverse().map((message) =>
          this.mapDirectMessage(message),
        ),
        nextCursor,
      };
    }

    if (direction === MESSAGE_DIRECTION.NEWER) {
      const messages = await this.prisma.directMessage.findMany({
        where: { conversationId, threadParentId: null },
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: 'asc' },
        include: includeQuery,
      });

      let prevCursor: string | undefined;
      if (messages.length > limit) {
        const prevItem = messages.pop();
        prevCursor = prevItem?.id;
      }

      return {
        messages: messages.map((message) => this.mapDirectMessage(message)),
        prevCursor,
      };
    }

    if (direction === MESSAGE_DIRECTION.AROUND && cursor) {
      const halfLimit = Math.floor(limit / 2);
      const [targetMessage, olderMessages, newerMessages] = await Promise.all([
        this.prisma.directMessage.findUnique({
          where: { id: cursor },
          include: includeQuery,
        }),
        this.prisma.directMessage.findMany({
          where: { conversationId, threadParentId: null },
          take: halfLimit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'desc' },
          include: includeQuery,
        }),
        this.prisma.directMessage.findMany({
          where: { conversationId, threadParentId: null },
          take: halfLimit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'asc' },
          include: includeQuery,
        }),
      ]);

      let nextCursor: string | undefined;
      if (olderMessages.length > halfLimit) {
        const nextItem = olderMessages.pop();
        nextCursor = nextItem?.id;
      }

      let prevCursor: string | undefined;
      if (newerMessages.length > halfLimit) {
        const prevItem = newerMessages.pop();
        prevCursor = prevItem?.id;
      }

      const messages = [
        ...olderMessages.reverse(),
        ...(targetMessage ? [targetMessage] : []),
        ...newerMessages,
      ];

      return {
        messages: messages.map((message) => this.mapDirectMessage(message)),
        nextCursor,
        prevCursor,
      };
    }

    return { messages: [], nextCursor: undefined, prevCursor: undefined };
  }

  async getDirectConversationMedia(
    conversationId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    mediaType?: string,
  ) {
    const medias = await this.prisma.directMedia.findMany({
      where: {
        ...this.getMediaTypeWhere(mediaType),
        message: {
          conversationId,
          deletedAt: null,
          recalled: false,
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
            id: true,
            senderId: true,
            createdAt: true,
            conversationId: true,
          },
        },
      },
    });

    let nextCursor: string | undefined;
    if (medias.length > limit) {
      const nextItem = medias.pop();
      nextCursor = nextItem?.id;
    }

    return {
      medias: mapMediaWithUrl(medias).map((media) => ({
        ...media,
        message: media.message
          ? {
              ...media.message,
              channelId: media.message.conversationId,
            }
          : media.message,
      })),
      nextCursor,
    };
  }

  async getDirectPinnedMessages(
    conversationId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
  ) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversationId,
        pinned: true,
        threadParentId: null,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: {
        medias: true,
        replyTo: true,
        threadFollowers: true,
      },
    });

    let nextCursor: string | undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    return {
      messages: messages.map((message) => this.mapDirectMessage(message)),
      nextCursor,
    };
  }

  async searchDirectMessages(
    conversationId: string,
    q?: string,
    senderId?: string,
    type?: string,
  ) {
    const whereClause: any = {
      conversationId,
      deletedAt: null,
      recalled: false,
      threadParentId: null,
    };

    if (q) {
      whereClause.OR = [
        { content: { contains: q, mode: 'insensitive' } },
        { medias: { some: { name: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    if (senderId) {
      whereClause.senderId = senderId;
    }

    if (type) {
      whereClause.type = type;
    }

    const messages = await this.prisma.directMessage.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        medias: true,
        replyTo: true,
        threadFollowers: true,
      },
      take: 10,
    });

    return messages.map((message) => this.mapDirectMessage(message));
  }

  getDirectConversationThreads(conversationId: string) {
    return this.prisma.directMessage.findMany({
      where: {
        conversationId,
        threadReplyCount: {
          gt: 0,
        },
        threadParentId: null,
      },
      include: {
        reactions: true,
        medias: true,
        replyTo: true,
        threadFollowers: true,
      },
      orderBy: {
        threadLastReplyAt: 'desc',
      },
    });
  }

  async getDirectThreadMessages(messageId: string) {
    const includeQuery = {
      reactions: true,
      medias: true,
      replyTo: true,
      threadFollowers: true,
    };

    const rootMessage = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      include: includeQuery,
    });

    if (!rootMessage) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.ROOT_THREAD_NOT_FOUND);
    }

    const replies = await this.prisma.directMessage.findMany({
      where: { threadParentId: messageId },
      orderBy: { createdAt: 'asc' },
      include: includeQuery,
    });

    return {
      rootMessage: this.mapDirectMessage(rootMessage),
      replies: replies.map((reply) => this.mapDirectMessage(reply)),
    };
  }

  async getDirectConversationMemberIds(conversationId: string) {
    const participants =
      await this.prisma.directConversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      });
    return participants.map((participant) => participant.userId);
  }

  async getDirectConversationMembersInfo(conversationId: string) {
    const participants =
      await this.prisma.directConversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true, muted: true },
      });
    return participants;
  }

  async getDirectThreadFollowers(messageId: string) {
    const followers = await this.prisma.directThreadFollower.findMany({
      where: { messageId },
      select: { userId: true },
    });
    return followers.map((follower) => follower.userId);
  }

  markDirectConversationAsRead(
    conversationId: string,
    userId: string,
    messageId: string,
  ) {
    return this.prisma.directConversationParticipant.update({
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

  private mapDirectMessage(message: any) {
    return {
      ...message,
      channelId: message.conversationId,
      medias: mapMediaWithUrl(message.medias || []),
    };
  }

  private getMediaTypeWhere(mediaType?: string): any {
    switch (mediaType) {
      case 'image':
        return { mimeType: { startsWith: 'image/' } };
      case 'video':
        return { mimeType: { startsWith: 'video/' } };
      case 'audio':
        return { mimeType: { startsWith: 'audio/' } };
      case 'pdf':
        return {
          OR: [
            { mimeType: 'application/pdf' },
            { name: { endsWith: '.pdf', mode: 'insensitive' } },
          ],
        };
      case 'document':
        return {
          OR: [
            { mimeType: { contains: 'word', mode: 'insensitive' } },
            { mimeType: { contains: 'opendocument.text', mode: 'insensitive' } },
            { name: { endsWith: '.doc', mode: 'insensitive' } },
            { name: { endsWith: '.docx', mode: 'insensitive' } },
            { name: { endsWith: '.txt', mode: 'insensitive' } },
          ],
        };
      case 'spreadsheet':
        return {
          OR: [
            { mimeType: { contains: 'spreadsheet', mode: 'insensitive' } },
            { mimeType: { contains: 'excel', mode: 'insensitive' } },
            { mimeType: 'text/csv' },
            { name: { endsWith: '.xls', mode: 'insensitive' } },
            { name: { endsWith: '.xlsx', mode: 'insensitive' } },
            { name: { endsWith: '.csv', mode: 'insensitive' } },
          ],
        };
      case 'presentation':
        return {
          OR: [
            { mimeType: { contains: 'presentation', mode: 'insensitive' } },
            { mimeType: { contains: 'powerpoint', mode: 'insensitive' } },
            { name: { endsWith: '.ppt', mode: 'insensitive' } },
            { name: { endsWith: '.pptx', mode: 'insensitive' } },
          ],
        };
      case 'archive':
        return {
          OR: [
            { mimeType: { contains: 'zip', mode: 'insensitive' } },
            { mimeType: { contains: 'rar', mode: 'insensitive' } },
            { mimeType: { contains: '7z', mode: 'insensitive' } },
            { mimeType: { contains: 'tar', mode: 'insensitive' } },
            { name: { endsWith: '.zip', mode: 'insensitive' } },
            { name: { endsWith: '.rar', mode: 'insensitive' } },
            { name: { endsWith: '.7z', mode: 'insensitive' } },
            { name: { endsWith: '.tar', mode: 'insensitive' } },
            { name: { endsWith: '.gz', mode: 'insensitive' } },
          ],
        };
      case 'code':
        return {
          OR: [
            { mimeType: { startsWith: 'text/' } },
            { name: { endsWith: '.js', mode: 'insensitive' } },
            { name: { endsWith: '.ts', mode: 'insensitive' } },
            { name: { endsWith: '.tsx', mode: 'insensitive' } },
            { name: { endsWith: '.jsx', mode: 'insensitive' } },
            { name: { endsWith: '.json', mode: 'insensitive' } },
            { name: { endsWith: '.css', mode: 'insensitive' } },
            { name: { endsWith: '.html', mode: 'insensitive' } },
            { name: { endsWith: '.java', mode: 'insensitive' } },
            { name: { endsWith: '.py', mode: 'insensitive' } },
          ],
        };
      case 'other':
        return {};
      default:
        return {};
    }
  }
}
