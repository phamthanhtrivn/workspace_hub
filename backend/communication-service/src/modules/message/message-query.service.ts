import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { MessageType, Prisma } from '@prisma/client';
import { mapMediaWithUrl } from '../../common/utils/file.util';
import {
  MESSAGE_DIRECTION,
  MESSAGE_CONSTANTS,
  MESSAGE_ERROR_MESSAGES,
} from './types/message.enums';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';

@Injectable()
export class MessageQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}
  async getConversationMessages(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    direction: MESSAGE_DIRECTION = MESSAGE_DIRECTION.OLDER,
  ) {
    const includeQuery = {
      reactions: true,
      medias: true,
      poll: { include: { options: { include: { votes: true } } } },
      note: true,
      meeting: true,
      threadFollowers: true,
    };

    if (direction === MESSAGE_DIRECTION.OLDER) {
      const messages = await this.prisma.message.findMany({
        where: { channelId, threadParentId: null },
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

      const mappedMessages = messages.reverse().map((message) => ({
        ...message,
        medias: mapMediaWithUrl(message.medias),
      }));
      return {
        messages:
          await this.userProfileSnapshotService.attachSenderProfilesToMessages(
            mappedMessages,
          ),
        nextCursor,
      };
    } else if (direction === MESSAGE_DIRECTION.NEWER) {
      const messages = await this.prisma.message.findMany({
        where: { channelId, threadParentId: null },
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

      const mappedMessages = messages.map((message) => ({
        ...message,
        medias: mapMediaWithUrl(message.medias),
      }));
      return {
        messages:
          await this.userProfileSnapshotService.attachSenderProfilesToMessages(
            mappedMessages,
          ),
        prevCursor,
      };
    } else if (direction === MESSAGE_DIRECTION.AROUND && cursor) {
      const halfLimit = Math.floor(limit / 2);

      const [targetMessage, olderMessages, newerMessages] = await Promise.all([
        this.prisma.message.findUnique({
          where: { id: cursor, channelId },
          include: includeQuery,
        }),
        this.prisma.message.findMany({
          where: { channelId, threadParentId: null },
          take: halfLimit + 1,
          skip: 1,
          cursor: { id: cursor },
          orderBy: { createdAt: 'desc' },
          include: includeQuery,
        }),
        this.prisma.message.findMany({
          where: { channelId, threadParentId: null },
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

      const mappedMessages = allMessages.map((message) => ({
        ...message,
        medias: mapMediaWithUrl(message.medias),
      }));
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

  async getConversationMedia(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    mediaType?: string,
    q?: string,
  ) {
    const mediaTypeWhere = this.getMediaTypeWhere(mediaType);
    const nameWhere = q
      ? { name: { contains: q, mode: 'insensitive' as const } }
      : {};

    const medias = await this.prisma.media.findMany({
      where: {
        ...mediaTypeWhere,
        ...nameWhere,
        message: {
          channelId,
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

  getMediaTypeWhere(mediaType?: string): Prisma.MediaWhereInput {
    switch (mediaType) {
      case 'image':
        return { mimeType: { startsWith: 'image/' } };
      case 'video':
        return { mimeType: { startsWith: 'video/' } };
      case 'audio':
        return { mimeType: { startsWith: 'audio/' } };
      case 'pdf':
        return { mimeType: 'application/pdf' };
      case 'document':
        return {
          OR: [
            { mimeType: { contains: 'wordprocessingml' } },
            { mimeType: { contains: 'msword' } },
            { mimeType: { contains: 'opendocument.text' } },
            { mimeType: 'text/plain' },
            { name: { endsWith: '.doc', mode: 'insensitive' } },
            { name: { endsWith: '.docx', mode: 'insensitive' } },
            { name: { endsWith: '.txt', mode: 'insensitive' } },
          ],
        };
      case 'spreadsheet':
        return {
          OR: [
            { mimeType: { contains: 'spreadsheet' } },
            { mimeType: { contains: 'excel' } },
            { mimeType: 'text/csv' },
            { name: { endsWith: '.xls', mode: 'insensitive' } },
            { name: { endsWith: '.xlsx', mode: 'insensitive' } },
            { name: { endsWith: '.csv', mode: 'insensitive' } },
          ],
        };
      case 'presentation':
        return {
          OR: [
            { mimeType: { contains: 'presentation' } },
            { mimeType: { contains: 'powerpoint' } },
            { name: { endsWith: '.ppt', mode: 'insensitive' } },
            { name: { endsWith: '.pptx', mode: 'insensitive' } },
          ],
        };
      case 'archive':
        return {
          OR: [
            { mimeType: { contains: 'zip' } },
            { mimeType: { contains: 'rar' } },
            { mimeType: { contains: '7z' } },
            { mimeType: { contains: 'tar' } },
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
        return {
          NOT: [
            { mimeType: { startsWith: 'image/' } },
            { mimeType: { startsWith: 'video/' } },
            { mimeType: { startsWith: 'audio/' } },
            { mimeType: 'application/pdf' },
            { mimeType: { contains: 'wordprocessingml' } },
            { mimeType: { contains: 'msword' } },
            { mimeType: { contains: 'opendocument.text' } },
            { mimeType: { contains: 'spreadsheet' } },
            { mimeType: { contains: 'excel' } },
            { mimeType: 'text/csv' },
            { mimeType: { contains: 'presentation' } },
            { mimeType: { contains: 'powerpoint' } },
            { mimeType: { contains: 'zip' } },
            { mimeType: { contains: 'rar' } },
            { mimeType: { contains: '7z' } },
            { mimeType: { contains: 'tar' } },
            { mimeType: { startsWith: 'text/' } },
            { name: { endsWith: '.pdf', mode: 'insensitive' } },
            { name: { endsWith: '.doc', mode: 'insensitive' } },
            { name: { endsWith: '.docx', mode: 'insensitive' } },
            { name: { endsWith: '.txt', mode: 'insensitive' } },
            { name: { endsWith: '.xls', mode: 'insensitive' } },
            { name: { endsWith: '.xlsx', mode: 'insensitive' } },
            { name: { endsWith: '.csv', mode: 'insensitive' } },
            { name: { endsWith: '.ppt', mode: 'insensitive' } },
            { name: { endsWith: '.pptx', mode: 'insensitive' } },
            { name: { endsWith: '.zip', mode: 'insensitive' } },
            { name: { endsWith: '.rar', mode: 'insensitive' } },
            { name: { endsWith: '.7z', mode: 'insensitive' } },
            { name: { endsWith: '.tar', mode: 'insensitive' } },
            { name: { endsWith: '.gz', mode: 'insensitive' } },
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
      default:
        return {};
    }
  }

  async searchMessages(
    channelId: string,
    q?: string,
    senderId?: string,
    type?: string,
  ) {
    const whereClause: Prisma.MessageWhereInput = {
      channelId,
      deletedAt: null,
      recalled: false,
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
    } else {
      whereClause.type = {
        notIn: [MessageType.POLL, MessageType.NOTE],
      };
    }

    const messages = await this.prisma.message.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
      },
      take: 10,
    });

    const mappedMessages = messages.map((message) => ({
      ...message,
      medias: mapMediaWithUrl(message.medias),
    }));
    return this.userProfileSnapshotService.attachSenderProfilesToMessages(
      mappedMessages,
    );
  }

  async getConversationThreads(channelId: string) {
    const includeQuery = {
      reactions: true,
      medias: true,
      poll: { include: { options: { include: { votes: true } } } },
      note: true,
    };

    const messages = await this.prisma.message.findMany({
      where: {
        channelId,
        threadReplyCount: {
          gt: 0,
        },
        threadParentId: null,
      },
      include: includeQuery,
      orderBy: {
        threadLastReplyAt: 'desc',
      },
    });
    const mappedMessages = messages.map((message) => ({
      ...message,
      medias: mapMediaWithUrl(message.medias),
    }));
    return this.userProfileSnapshotService.attachSenderProfilesToMessages(
      mappedMessages,
    );
  }

  async getFollowedThreads(userId: string) {
    const followers = await this.prisma.threadFollower.findMany({
      where: {
        userId,
        message: {
          threadReplyCount: { gt: 0 },
          threadParentId: null,
          channel: {
            members: {
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
            poll: { include: { options: { include: { votes: true } } } },
            note: true,
            threadFollowers: true,
            channel: {
              include: {
                members: true,
                setting: true,
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
        const unreadReplyCount = await this.prisma.message.count({
          where: {
            threadParentId: follower.messageId,
            createdAt: { gt: unreadSince },
            senderId: { not: userId },
          },
        });
        const { channel, ...message } = follower.message;
        const rootMessage =
          await this.userProfileSnapshotService.attachSenderProfileToMessage({
            ...message,
            chatId: channel.id,
            chatType: CHAT_CONTEXT_TYPE.CHANNEL,
            channelId: channel.id,
            medias: mapMediaWithUrl(message.medias),
          });
        const members =
          await this.userProfileSnapshotService.attachProfilesToMembers(
            channel.members ?? [],
          );

        return {
          rootMessage,
          chat: {
            ...channel,
            members,
          },
          chatId: channel.id,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          chatName: channel.name,
          replyCount: message.threadReplyCount,
          lastReplyAt: message.threadLastReplyAt,
          unreadReplyCount,
          isFollowing: true,
        };
      }),
    );
  }

  async getThreadMessages(messageId: string) {
    const includeQuery = {
      reactions: true,
      medias: true,
      poll: { include: { options: { include: { votes: true } } } },
      note: true,
      threadFollowers: true,
    };

    const rootMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: includeQuery,
    });

    if (!rootMessage) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.ROOT_THREAD_NOT_FOUND);
    }

    const replies = await this.prisma.message.findMany({
      where: { threadParentId: messageId },
      orderBy: { createdAt: 'asc' },
      include: includeQuery,
    });

    const mappedRootMessage = {
      ...rootMessage,
      medias: mapMediaWithUrl(rootMessage.medias),
    };
    const mappedReplies = replies.map((reply) => ({
      ...reply,
      medias: mapMediaWithUrl(reply.medias),
    }));

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

  async getConversationMemberIds(channelId: string): Promise<string[]> {
    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async getConversationMembersInfo(
    channelId: string,
  ): Promise<{ userId: string; muted: boolean }[]> {
    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true, muted: true },
    });
    return members.map((m) => ({
      userId: m.userId,
      muted: m.muted,
    }));
  }

  async getPinnedMessages(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
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

    const messages = await this.prisma.message.findMany({
      where: {
        channelId,
        pinned: true,
        threadParentId: null,
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
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
      },
    });

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    const mappedMessages = messages.map((message) => ({
      ...message,
      medias: mapMediaWithUrl(message.medias),
    }));
    return {
      messages:
        await this.userProfileSnapshotService.attachSenderProfilesToMessages(
          mappedMessages,
        ),
      nextCursor,
    };
  }

  async getThreadFollowers(messageId: string): Promise<string[]> {
    const followers = await this.prisma.threadFollower.findMany({
      where: { messageId },
      select: { userId: true },
    });
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });
    if (!message?.channelId) return followers.map((f) => f.userId);
    const members = await this.prisma.channelMember.findMany({
      where: {
        channelId: message.channelId,
        userId: { in: followers.map((f) => f.userId) },
      },
      select: { userId: true },
    });
    return members.map((member) => member.userId);
  }

  async getMessageChannelId(messageId: string): Promise<string> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });

    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    return message.channelId;
  }
}
