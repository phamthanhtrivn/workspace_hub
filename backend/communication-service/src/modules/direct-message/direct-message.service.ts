import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/infrastructure/s3/s3.service';
import { getMediaType, mapMediaWithUrl } from 'src/common/utils/file.util';
import {
  MESSAGE_CONSTANTS,
  MESSAGE_DIRECTION,
  MESSAGE_ERROR_MESSAGES,
} from '../message/types/message.enums';
import { CHAT_CONTEXT_TYPE } from '../chat/chat.enums';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';

@Injectable()
export class DirectMessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}

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
    const createdMessage = await this.prisma.$transaction(async (tx) => {
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
          throw new BadRequestException(
            MESSAGE_ERROR_MESSAGES.PARENT_NOT_FOUND,
          );
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

    return this.userProfileSnapshotService.attachSenderProfileToMessage(
      createdMessage,
    );
  }

  async getDirectConversationMessages(
    conversationId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    direction: MESSAGE_DIRECTION = MESSAGE_DIRECTION.OLDER,
  ) {
    const includeQuery = {
      reactions: true,
      medias: true,
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

      const mappedMessages = messages
        .reverse()
        .map((message) => this.mapDirectMessage(message));

      return {
        messages:
          await this.userProfileSnapshotService.attachSenderProfilesToMessages(
            mappedMessages,
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

      const mappedMessages = messages.map((message) =>
        this.mapDirectMessage(message),
      );

      return {
        messages:
          await this.userProfileSnapshotService.attachSenderProfilesToMessages(
            mappedMessages,
          ),
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

      const mappedMessages = messages.map((message) =>
        this.mapDirectMessage(message),
      );

      return {
        messages:
          await this.userProfileSnapshotService.attachSenderProfilesToMessages(
            mappedMessages,
          ),
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
    q?: string,
  ) {
    const nameWhere = q
      ? { name: { contains: q, mode: 'insensitive' as const } }
      : {};
    const medias = await this.prisma.directMedia.findMany({
      where: {
        ...this.getMediaTypeWhere(mediaType),
        ...nameWhere,
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
    senderId?: string,
    q?: string,
  ) {
    const matchedUsers = q
      ? await this.prisma.userProfileSnapshot.findMany({
          where: {
            fullName: {
              contains: q,
              mode: 'insensitive' as const,
            },
          },
          select: {
            userId: true,
          },
        })
      : [];
    const matchedUserIds = matchedUsers.map((u) => u.userId);

    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversationId,
        pinned: true,
        threadParentId: null,
        senderId: senderId || undefined,
        ...(q && {
          OR: [
            {
              content: {
                contains: q,
                mode: 'insensitive' as const,
              },
            },
            {
              senderId: {
                in: matchedUserIds,
              },
            },
          ],
        }),
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: {
        reactions: true,
        medias: true,
        threadFollowers: true,
      },
    });

    let nextCursor: string | undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    const mappedMessages = messages.map((message) =>
      this.mapDirectMessage(message),
    );

    return {
      messages:
        await this.userProfileSnapshotService.attachSenderProfilesToMessages(
          mappedMessages,
        ),
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
        threadFollowers: true,
      },
      take: 10,
    });

    const mappedMessages = messages.map((message) =>
      this.mapDirectMessage(message),
    );
    return this.userProfileSnapshotService.attachSenderProfilesToMessages(
      mappedMessages,
    );
  }

  async getDirectConversationThreads(
    conversationId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    senderId?: string,
  ) {
    const messages = await this.prisma.directMessage.findMany({
      where: {
        conversationId,
        senderId: senderId || undefined,
        threadReplyCount: {
          gt: 0,
        },
        threadParentId: null,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      include: {
        reactions: true,
        medias: true,
        threadFollowers: true,
      },
      orderBy: {
        threadLastReplyAt: 'desc',
      },
    });

    let nextCursor: string | undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    const mappedMessages = messages.map((message) =>
      this.mapDirectMessage(message),
    );

    return {
      messages:
        await this.userProfileSnapshotService.attachSenderProfilesToMessages(
          mappedMessages,
        ),
      nextCursor,
    };
  }

  async getFollowedDirectThreads(userId: string) {
    const followers = await this.prisma.directThreadFollower.findMany({
      where: {
        userId,
        message: {
          threadReplyCount: { gt: 0 },
          threadParentId: null,
          conversation: {
            participants: {
              some: { userId },
            },
          },
        },
      },
      include: {
        message: {
          include: {
            reactions: true,
            medias: true,
            threadFollowers: true,
            conversation: {
              include: {
                participants: true,
              },
            },
          },
        },
      },
      orderBy: {
        message: {
          threadLastReplyAt: 'desc',
        },
      },
    });

    return Promise.all(
      followers.map(async (follower) => {
        const unreadSince = (follower as any).lastReadAt ?? follower.createdAt;
        const unreadReplyCount = await this.prisma.directMessage.count({
          where: {
            threadParentId: follower.messageId,
            createdAt: { gt: unreadSince },
            senderId: { not: userId },
          },
        });
        const { conversation, ...message } = follower.message as any;
        const rootMessage =
          await this.userProfileSnapshotService.attachSenderProfileToMessage(
            this.mapDirectMessage(message),
          );
        const members =
          await this.userProfileSnapshotService.attachProfilesToMembers(
            conversation.participants ?? [],
          );

        return {
          rootMessage,
          chat: {
            ...conversation,
            members,
          },
          chatId: conversation.id,
          chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
          chatName: null,
          replyCount: message.threadReplyCount,
          lastReplyAt: message.threadLastReplyAt,
          unreadReplyCount,
          isFollowing: true,
        };
      }),
    );
  }

  async getDirectThreadMessages(messageId: string) {
    const includeQuery = {
      reactions: true,
      medias: true,
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

    const mappedRootMessage = this.mapDirectMessage(rootMessage);
    const mappedReplies = replies.map((reply) => this.mapDirectMessage(reply));

    return {
      rootMessage:
        await this.userProfileSnapshotService.attachSenderProfileToMessage(
          mappedRootMessage,
        ),
      replies:
        await this.userProfileSnapshotService.attachSenderProfilesToMessages(
          mappedReplies,
        ),
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

  async getDirectMessageConversationId(messageId: string) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }
    return message.conversationId;
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

  async addDirectReaction(messageId: string, userId: string, emoji: string) {
    await this.assertDirectMessageMember(messageId, userId);
    const existing = await this.prisma.directReaction.findFirst({
      where: { messageId, userId },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        await this.prisma.directReaction.delete({ where: { id: existing.id } });
        return { action: 'remove', emoji };
      }

      await this.prisma.directReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
      return { action: 'update', emoji };
    }

    await this.prisma.directReaction.create({
      data: { messageId, userId, emoji },
    });
    return { action: 'add', emoji };
  }

  async removeDirectReaction(messageId: string, userId: string, emoji: string) {
    await this.assertDirectMessageMember(messageId, userId);
    return this.prisma.directReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
  }

  async editDirectMessage(messageId: string, content: string, userId: string) {
    const message = await this.getOwnedDirectMessage(messageId, userId);
    if (message.type !== MessageType.TEXT) {
      throw new BadRequestException('Only text messages can be edited');
    }
    if (content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }
    this.assertWithin24Hours(
      message.createdAt,
      'Messages can only be edited within 24 hours',
    );

    const updatedMessage = await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { content, edited: true },
      include: {
        reactions: true,
        medias: true,
        threadFollowers: true,
      },
    });
    return this.mapDirectMessage(updatedMessage);
  }

  async recallDirectMessage(messageId: string, userId: string) {
    const message = await this.getOwnedDirectMessage(messageId, userId, {
      medias: true,
    });
    this.assertWithin24Hours(
      message.createdAt,
      'Messages can only be recalled within 24 hours',
    );

    if (message.medias && message.medias.length > 0) {
      for (const media of message.medias) {
        if (media.s3Key) {
          await this.s3Service.deleteFile(media.s3Key);
        }
      }
      await this.prisma.directMedia.deleteMany({ where: { messageId } });
    }

    // Delete direct reactions and direct thread followers
    await Promise.all([
      this.prisma.directReaction.deleteMany({ where: { messageId } }),
      this.prisma.directThreadFollower.deleteMany({ where: { messageId } }),
    ]);

    const updatedMessage = await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { recalled: true, content: null, pinned: false },
      include: {
        reactions: true,
        medias: true,
        threadFollowers: true,
      },
    });
    return this.mapDirectMessage(updatedMessage);
  }

  async deleteDirectMessage(messageId: string, userId: string) {
    await this.getOwnedDirectMessage(messageId, userId);
    const deletedMessage = await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: {
        reactions: true,
        medias: true,
        threadFollowers: true,
      },
    });
    return this.mapDirectMessage(deletedMessage);
  }

  async pinDirectMessage(messageId: string, userId: string) {
    const message = await this.assertDirectMessageMember(messageId, userId);
    if (message.pinned) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.ALREADY_PINNED);
    }

    const updatedMessage = await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { pinned: true },
      include: {
        reactions: true,
        medias: true,
        threadFollowers: true,
      },
    });
    return this.mapDirectMessage(updatedMessage);
  }

  async unpinDirectMessage(messageId: string, userId: string) {
    const message = await this.assertDirectMessageMember(messageId, userId);
    if (!message.pinned) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOT_PINNED);
    }

    const updatedMessage = await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { pinned: false },
      include: {
        reactions: true,
        medias: true,
        threadFollowers: true,
      },
    });
    return this.mapDirectMessage(updatedMessage);
  }

  async followDirectThread(messageId: string, userId: string) {
    await this.assertDirectMessageMember(messageId, userId);
    await this.prisma.directThreadFollower.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: { lastReadAt: new Date() } as any,
      create: { messageId, userId, lastReadAt: new Date() } as any,
    });
    return { following: true };
  }

  async unfollowDirectThread(messageId: string, userId: string) {
    await this.assertDirectMessageMember(messageId, userId);
    await this.prisma.directThreadFollower.deleteMany({
      where: { messageId, userId },
    });
    return { following: false };
  }

  async markDirectThreadAsRead(messageId: string, userId: string) {
    await this.assertDirectMessageMember(messageId, userId);
    const lastReadAt = new Date();
    await this.prisma.directThreadFollower.updateMany({
      where: { messageId, userId },
      data: { lastReadAt } as any,
    });
    return { messageId, lastReadAt };
  }

  private mapDirectMessage(message: any) {
    return {
      ...message,
      chatId: message.conversationId,
      chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      medias: mapMediaWithUrl(message.medias || []),
    };
  }

  private async assertDirectMessageMember(messageId: string, userId: string) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    const participant =
      await this.prisma.directConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: message.conversationId,
            userId,
          },
        },
      });
    if (!participant) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CONVERSATION,
      );
    }
    return message;
  }

  private async getOwnedDirectMessage(
    messageId: string,
    userId: string,
    include?: any,
  ) {
    const message = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      include,
    });
    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }
    if (message.senderId !== userId) {
      throw new BadRequestException('You can only modify your own messages');
    }
    return message as any;
  }

  private assertWithin24Hours(createdAt: Date, errorMessage: string) {
    const hoursDifference =
      (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    if (hoursDifference > 24) {
      throw new BadRequestException(errorMessage);
    }
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
            {
              mimeType: { contains: 'opendocument.text', mode: 'insensitive' },
            },
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
