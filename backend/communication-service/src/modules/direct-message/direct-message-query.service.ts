import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { mapMediaWithUrl } from '../../common/utils/file.util';
import {
  MESSAGE_CONSTANTS,
  MESSAGE_DIRECTION,
  MESSAGE_ERROR_MESSAGES,
} from '../message/types/message.enums';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { DirectMessagePermissionService } from './direct-message-permission.service';
import { DirectMessagePresentationService } from './direct-message-presentation.service';
import { DirectMessageAccessService } from './direct-message-access.service';

@Injectable()
export class DirectMessageQueryService {
  constructor(
    private readonly directMessagePermissionService: DirectMessagePermissionService,
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly presentation: DirectMessagePresentationService,
    private readonly access: DirectMessageAccessService,
  ) {}
  async getDirectConversationMessages(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    direction: MESSAGE_DIRECTION = MESSAGE_DIRECTION.OLDER,
  ) {
    await this.directMessagePermissionService.assertCanRead(
      conversationId,
      userId,
    );
    const includeQuery = {
      reactions: true,
      medias: true,
      meeting: true,
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
        .map((message) => this.presentation.mapDirectMessage(message));

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
        this.presentation.mapDirectMessage(message),
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
        this.presentation.mapDirectMessage(message),
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
    userId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    mediaType?: string,
    q?: string,
  ) {
    await this.directMessagePermissionService.assertCanRead(
      conversationId,
      userId,
    );
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
    userId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    senderId?: string,
    q?: string,
  ) {
    await this.directMessagePermissionService.assertCanRead(
      conversationId,
      userId,
    );
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
      this.presentation.mapDirectMessage(message),
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
    userId: string,
    q?: string,
    senderId?: string,
    type?: string,
  ) {
    await this.directMessagePermissionService.assertCanRead(
      conversationId,
      userId,
    );
    const whereClause: Prisma.DirectMessageWhereInput = {
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
      whereClause.type = type as MessageType;
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
      this.presentation.mapDirectMessage(message),
    );
    return this.userProfileSnapshotService.attachSenderProfilesToMessages(
      mappedMessages,
    );
  }

  async getDirectConversationThreads(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    senderId?: string,
  ) {
    await this.directMessagePermissionService.assertCanRead(
      conversationId,
      userId,
    );
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
      this.presentation.mapDirectMessage(message),
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
        const unreadSince = follower.lastReadAt ?? follower.createdAt;
        const unreadReplyCount = await this.prisma.directMessage.count({
          where: {
            threadParentId: follower.messageId,
            createdAt: { gt: unreadSince },
            senderId: { not: userId },
          },
        });
        const { conversation, ...message } = follower.message;
        const rootMessage =
          await this.userProfileSnapshotService.attachSenderProfileToMessage(
            this.presentation.mapDirectMessage(message),
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

  async getDirectThreadMessages(messageId: string, userId: string) {
    await this.access.assertDirectMessageMember(messageId, userId);
    const includeQuery = {
      reactions: true,
      medias: true,
      meeting: true,
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

    const mappedRootMessage = this.presentation.mapDirectMessage(rootMessage);
    const mappedReplies = replies.map((reply) =>
      this.presentation.mapDirectMessage(reply),
    );

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

  getMediaTypeWhere(mediaType?: string): Prisma.DirectMediaWhereInput {
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
