import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType, Prisma, SpaceRole } from '@prisma/client';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { getMediaType, mapMediaWithUrl } from '../../common/utils/file.util';
import { MESSAGE_DIRECTION, MESSAGE_CONSTANTS, MESSAGE_ERROR_MESSAGES } from './types/message.enums';

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  async createMessage(
    channelId: string,
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
    threadParentId?: string,
  ): Promise<any> {
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
    });

    if (isDirect) {
      return this.prisma.$transaction(async (tx) => {
        const participant = await tx.directConversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: channelId,
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
          const parentMsg = await tx.directMessage.findUnique({
            where: { id: threadParentId },
          });
          if (!parentMsg || parentMsg.conversationId !== channelId) {
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
                userId: parentMsg.senderId,
              },
            },
            update: {},
            create: { messageId: threadParentId, userId: parentMsg.senderId },
          });

          await tx.directThreadFollower.upsert({
            where: {
              messageId_userId: { messageId: threadParentId, userId: senderId },
            },
            update: {},
            create: { messageId: threadParentId, userId: senderId },
          });
        }

        const dm = await tx.directMessage.create({
          data: {
            conversationId: channelId,
            senderId,
            content,
            type: type || MessageType.TEXT,
            replyToMessageId,
            threadParentId,
            medias:
              medias && medias.length > 0
                ? {
                    create: medias.map((m) => ({
                      name: m.name,
                      s3Key: m.s3Key,
                      mimeType: m.mimeType,
                      sizeBytes: m.sizeBytes,
                      type: getMediaType(m.mimeType),
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
          where: { id: channelId },
          data: { updatedAt: new Date() },
        });

        await tx.directConversationParticipant.update({
          where: {
            conversationId_userId: {
              conversationId: channelId,
              userId: senderId,
            },
          },
          data: {
            lastReadMessageId: dm.id,
            lastReadAt: new Date(),
          },
        });

        return dm;
      });
    }

    return this.prisma.$transaction(async (tx) => {
      if (type !== MessageType.SYSTEM) {
        const member = (await tx.channelMember.findUnique({
          where: { channelId_userId: { channelId, userId: senderId } },
          include: { channel: { include: { setting: true } } },
        })) as any;

        if (!member) {
          throw new BadRequestException(
            MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
          );
        }

        const spaceMember = await tx.spaceMember.findUnique({
          where: {
            spaceId_userId: {
              spaceId: member.channel.spaceId,
              userId: senderId,
            },
          },
        });

        if (!spaceMember) {
          throw new BadRequestException(
            MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_SPACE,
          );
        }

        if (spaceMember.role === SpaceRole.MEMBER && member.channel.setting) {
          const setting = member.channel.setting;
          if (type === MessageType.TEXT && !setting.allowSendMessage) {
            throw new BadRequestException(
              MESSAGE_ERROR_MESSAGES.MESSAGE_DISABLED,
            );
          }
          if (type === MessageType.POLL && !setting.allowCreatePoll) {
            throw new BadRequestException(
              MESSAGE_ERROR_MESSAGES.POLL_DISABLED,
            );
          }
          if (type === MessageType.NOTE && !setting.allowCreateNote) {
            throw new BadRequestException(
              MESSAGE_ERROR_MESSAGES.NOTE_DISABLED,
            );
          }
        }
      }

      if (threadParentId) {
        const parentMsg = await tx.message.findUnique({
          where: { id: threadParentId },
        });
        if (!parentMsg) {
          throw new BadRequestException(MESSAGE_ERROR_MESSAGES.PARENT_NOT_FOUND);
        }
        await tx.message.update({
          where: { id: threadParentId },
          data: {
            threadReplyCount: { increment: 1 },
            threadLastReplyAt: new Date(),
          },
        });

        // Add parent author as follower if not exists
        const followParentAuthor = await tx.threadFollower.findUnique({
          where: {
            messageId_userId: {
              messageId: threadParentId,
              userId: parentMsg.senderId,
            },
          },
        });
        if (!followParentAuthor) {
          await tx.threadFollower.create({
            data: { messageId: threadParentId, userId: parentMsg.senderId },
          });
        }

        // Add sender as follower if not exists
        const followSender = await tx.threadFollower.findUnique({
          where: {
            messageId_userId: { messageId: threadParentId, userId: senderId },
          },
        });
        if (!followSender) {
          await tx.threadFollower.create({
            data: { messageId: threadParentId, userId: senderId },
          });
        }
      }

      const message = await tx.message.create({
        data: {
          channelId,
          senderId,
          content,
          type,
          replyToMessageId,
          threadParentId,
          medias:
            medias && medias.length > 0
              ? {
                  create: medias.map((m) => {
                    const mediaType = getMediaType(m.mimeType);
                    return {
                      name: m.name,
                      s3Key: m.s3Key,
                      mimeType: m.mimeType,
                      sizeBytes: m.sizeBytes,
                      type: mediaType,
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

      await tx.channel.update({
        where: { id: channelId },
        data: { updatedAt: new Date() },
      });

      if (type !== MessageType.SYSTEM) {
        await tx.channelMember.update({
          where: {
            channelId_userId: {
              channelId,
              userId: senderId,
            },
          },
          data: {
            lastReadMessageId: message.id,
            lastReadAt: new Date(),
          },
        });
      }

      return message;
    });
  }

  async getConversationMessages(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    direction: MESSAGE_DIRECTION = MESSAGE_DIRECTION.OLDER,
  ) {
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
    });

    if (isDirect) {
      const includeQuery = {
        medias: true,
        replyTo: true,
        threadFollowers: true,
      };

      if (direction === MESSAGE_DIRECTION.OLDER) {
        const messages = await this.prisma.directMessage.findMany({
          where: { conversationId: channelId, threadParentId: null },
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
      } else if (direction === MESSAGE_DIRECTION.NEWER) {
        const messages = await this.prisma.directMessage.findMany({
          where: { conversationId: channelId, threadParentId: null },
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
      } else if (direction === MESSAGE_DIRECTION.AROUND && cursor) {
        const halfLimit = Math.floor(limit / 2);

        const [targetMessage, olderMessages, newerMessages] = await Promise.all(
          [
            this.prisma.directMessage.findUnique({
              where: { id: cursor },
              include: includeQuery,
            }),
            this.prisma.directMessage.findMany({
              where: { conversationId: channelId, threadParentId: null },
              take: halfLimit + 1,
              skip: 1,
              cursor: { id: cursor },
              orderBy: { createdAt: 'desc' },
              include: includeQuery,
            }),
            this.prisma.directMessage.findMany({
              where: { conversationId: channelId, threadParentId: null },
              take: halfLimit + 1,
              skip: 1,
              cursor: { id: cursor },
              orderBy: { createdAt: 'asc' },
              include: includeQuery,
            }),
          ],
        );

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

    const includeQuery = {
      reactions: true,
      medias: true,
      poll: { include: { options: { include: { votes: true } } } },
      note: true,
      replyTo: true,
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

      return {
        messages: messages.reverse().map((message) => ({
          ...message,
          medias: mapMediaWithUrl(message.medias),
        })),
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

      return {
        messages: messages.map((message) => ({
          ...message,
          medias: mapMediaWithUrl(message.medias),
        })),
        prevCursor,
      };
    } else if (direction === MESSAGE_DIRECTION.AROUND && cursor) {
      const halfLimit = Math.floor(limit / 2);

      const [targetMessage, olderMessages, newerMessages] = await Promise.all([
        this.prisma.message.findUnique({
          where: { id: cursor },
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

  async getConversationMedia(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
    mediaType?: string,
  ) {
    const mediaTypeWhere = this.getMediaTypeWhere(mediaType);
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
      select: { id: true },
    });

    if (isDirect) {
      const medias = await this.prisma.directMedia.findMany({
        where: {
          ...mediaTypeWhere,
          message: {
            conversationId: channelId,
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

      let nextCursor: string | undefined = undefined;
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

    const medias = await this.prisma.media.findMany({
      where: {
        ...mediaTypeWhere,
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

  private getMediaTypeWhere(mediaType?: string): Record<string, any> {
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
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
      select: { id: true },
    });

    if (isDirect) {
      const whereClause: any = {
        conversationId: channelId,
        deletedAt: null,
        recalled: false,
        threadParentId: null,
      };

      if (q) {
        whereClause.OR = [
          { content: { contains: q, mode: 'insensitive' } },
          {
            medias: {
              some: { name: { contains: q, mode: 'insensitive' } },
            },
          },
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

      return messages.map((message) => ({
        ...message,
        channelId: message.conversationId,
        medias: mapMediaWithUrl(message.medias),
      }));
    }

    const whereClause: any = {
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
      whereClause.type = type;
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
        replyTo: true,
      },
      take: 10,
    });

    return messages.map((message) => ({
      ...message,
      medias: mapMediaWithUrl(message.medias),
    }));
  }

  async getConversationThreads(channelId: string) {
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
    });

    if (isDirect) {
      return this.prisma.directMessage.findMany({
        where: {
          conversationId: channelId,
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

    const includeQuery = {
      reactions: true,
      medias: true,
      poll: { include: { options: { include: { votes: true } } } },
      note: true,
      replyTo: true,
    };

    return this.prisma.message.findMany({
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
  }

  async toggleFollowThread(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      const directMessage = await this.prisma.directMessage.findUnique({
        where: { id: messageId },
      });

      if (!directMessage) {
        throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
      }

      const existingDirectFollow =
        await this.prisma.directThreadFollower.findUnique({
          where: {
            messageId_userId: {
              messageId,
              userId,
            },
          },
        });

      if (existingDirectFollow) {
        await this.prisma.directThreadFollower.delete({
          where: {
            messageId_userId: {
              messageId,
              userId,
            },
          },
        });
        return { following: false };
      }

      await this.prisma.directThreadFollower.create({
        data: {
          messageId,
          userId,
        },
      });
      return { following: true };
    }

    const existingFollow = await this.prisma.threadFollower.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (existingFollow) {
      await this.prisma.threadFollower.delete({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
      });
      return { following: false };
    }

    await this.prisma.threadFollower.create({
      data: {
        messageId,
        userId,
      },
    });
    return { following: true };
  }

  async getThreadMessages(messageId: string) {
    const includeQuery = {
      reactions: true,
      medias: true,
      poll: { include: { options: { include: { votes: true } } } },
      note: true,
      replyTo: true,
      threadFollowers: true,
    };

    const rootMessage = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: includeQuery,
    });

    if (!rootMessage) {
      const directIncludeQuery = {
        reactions: true,
        medias: true,
        replyTo: true,
        threadFollowers: true,
      };

      const directRootMessage = await this.prisma.directMessage.findUnique({
        where: { id: messageId },
        include: directIncludeQuery,
      });

      if (!directRootMessage) {
        throw new NotFoundException(
          MESSAGE_ERROR_MESSAGES.ROOT_THREAD_NOT_FOUND,
        );
      }

      const directReplies = await this.prisma.directMessage.findMany({
        where: { threadParentId: messageId },
        orderBy: { createdAt: 'asc' },
        include: directIncludeQuery,
      });

      return {
        rootMessage: {
          ...directRootMessage,
          channelId: directRootMessage.conversationId,
          medias: mapMediaWithUrl(directRootMessage.medias),
        },
        replies: directReplies.map((reply) => ({
          ...reply,
          channelId: reply.conversationId,
          medias: mapMediaWithUrl(reply.medias),
        })),
      };
    }

    const replies = await this.prisma.message.findMany({
      where: { threadParentId: messageId },
      orderBy: { createdAt: 'asc' },
      include: includeQuery,
    });

    return {
      rootMessage: {
        ...rootMessage,
        medias: mapMediaWithUrl(rootMessage.medias),
      },
      replies: replies.map((reply) => ({
        ...reply,
        medias: mapMediaWithUrl(reply.medias),
      })),
    };
  }

  async getConversationMemberIds(channelId: string): Promise<string[]> {
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
    });

    if (isDirect) {
      const participants =
        await this.prisma.directConversationParticipant.findMany({
          where: { conversationId: channelId },
          select: { userId: true },
        });
      return participants.map((participant) => participant.userId);
    }

    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  async getConversationMembersInfo(
    channelId: string,
  ): Promise<{ userId: string; muted: boolean }[]> {
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
      select: { id: true },
    });

    if (isDirect) {
      const participants =
        await this.prisma.directConversationParticipant.findMany({
          where: { conversationId: channelId },
          select: { userId: true, muted: true },
        });

      return participants.map((participant) => ({
        userId: participant.userId,
        muted: participant.muted,
      }));
    }

    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true, muted: true },
    });
    return members.map((m) => ({
      userId: m.userId,
      muted: m.muted,
    }));
  }

  async addReaction(messageId: string, userId: string, emoji: string) {
    const isDirectMsg = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (isDirectMsg) {
      const existing = await this.prisma.directReaction.findFirst({
        where: { messageId, userId },
      });

      if (existing) {
        if (existing.emoji === emoji) {
          await this.prisma.directReaction.delete({
            where: { id: existing.id },
          });
          return { action: 'remove', emoji };
        } else {
          await this.prisma.directReaction.update({
            where: { id: existing.id },
            data: { emoji },
          });
          return { action: 'update', emoji };
        }
      } else {
        await this.prisma.directReaction.create({
          data: { messageId, userId, emoji },
        });
        return { action: 'add', emoji };
      }
    }

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
    const isDirectMsg = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (isDirectMsg) {
      return this.prisma.directReaction.deleteMany({
        where: {
          messageId,
          userId,
          emoji,
        },
      });
    }

    return this.prisma.reaction.deleteMany({
      where: {
        messageId,
        userId,
        emoji,
      },
    });
  }

  async markConversationAsRead(
    channelId: string,
    userId: string,
    messageId: string,
  ) {
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
    });

    if (isDirect) {
      return this.prisma.directConversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: channelId,
            userId,
          },
        },
        data: {
          lastReadMessageId: messageId,
          lastReadAt: new Date(),
        },
      });
    }

    return this.prisma.channelMember.update({
      where: {
        channelId_userId: {
          channelId,
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
    const isDirectMsg = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (isDirectMsg) {
      if (isDirectMsg.senderId !== userId) {
        throw new Error('You can only edit your own messages');
      }
      if (isDirectMsg.type !== MessageType.TEXT) {
        throw new Error('Only text messages can be edited');
      }
      if (content.trim().length === 0) {
        throw new Error('Message content cannot be empty');
      }
      const now = new Date().getTime();
      const createdAt = new Date(isDirectMsg.createdAt).getTime();
      const hoursDifference = (now - createdAt) / (1000 * 60 * 60);
      if (hoursDifference > 24) {
        throw new Error('Messages can only be edited within 24 hours');
      }
      return this.prisma.directMessage.update({
        where: { id: messageId },
        data: { content, edited: true },
        include: { medias: true, replyTo: true },
      });
    }

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only edit your own messages');
    }

    if (message.type !== MessageType.TEXT) {
      throw new Error('Only text messages can be edited');
    }

    if (content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    const now = new Date().getTime();
    const createdAt = new Date(message.createdAt).getTime();
    const hoursDifference = (now - createdAt) / (1000 * 60 * 60);

    if (hoursDifference > 24) {
      throw new Error('Messages can only be edited within 24 hours');
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
    const isDirectMsg = await this.prisma.directMessage.findUnique({
      where: { id: messageId },
      include: { medias: true },
    });

    if (isDirectMsg) {
      if (isDirectMsg.senderId !== userId) {
        throw new Error('You can only recall your own messages');
      }
      const now = new Date();
      const createdAt = new Date(isDirectMsg.createdAt);
      if (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
        throw new Error('Messages can only be recalled within 24 hours');
      }
      if (isDirectMsg.medias && isDirectMsg.medias.length > 0) {
        for (const media of isDirectMsg.medias) {
          if (media.s3Key) {
            await this.s3Service.deleteFile(media.s3Key);
          }
        }
        await this.prisma.directMedia.deleteMany({ where: { messageId } });
      }
      return this.prisma.directMessage.update({
        where: { id: messageId },
        data: { recalled: true, content: null },
        include: { medias: true, replyTo: true },
      });
    }

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { medias: true },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('You can only recall your own messages');
    }

    const now = new Date();
    const createdAt = new Date(message.createdAt);
    if (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
      throw new Error('Messages can only be recalled within 24 hours');
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
      const directMessage = await this.prisma.directMessage.findUnique({
        where: { id: messageId },
      });

      if (!directMessage) {
        throw new Error(MESSAGE_ERROR_MESSAGES.NOT_FOUND_SIMPLE);
      }

      if (directMessage.pinned) {
        throw new BadRequestException(MESSAGE_ERROR_MESSAGES.ALREADY_PINNED);
      }

      const participant =
        await this.prisma.directConversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: directMessage.conversationId,
              userId,
            },
          },
        });

      if (!participant) {
        throw new BadRequestException(
          MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CONVERSATION,
        );
      }

      return this.prisma.directMessage.update({
        where: { id: messageId },
        data: { pinned: true },
        include: {
          medias: true,
          replyTo: true,
          threadFollowers: true,
        },
      });
    }

    if (message.pinned) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.ALREADY_PINNED);
    }

    const member = (await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: message.channelId, userId } },
      include: { channel: { include: { setting: true } } },
    })) as any;

    if (!member) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_GROUP);
    }

    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: member.channel.spaceId,
          userId,
        },
      },
    });

    if (!spaceMember) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_SPACE,
      );
    }

    if (
      spaceMember.role === SpaceRole.MEMBER &&
      member.channel.setting &&
      !member.channel.setting.allowPinMessage
    ) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.PIN_DISABLED,
      );
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
      const directMessage = await this.prisma.directMessage.findUnique({
        where: { id: messageId },
      });

      if (!directMessage) {
        throw new Error(MESSAGE_ERROR_MESSAGES.NOT_FOUND_SIMPLE);
      }

      if (!directMessage.pinned) {
        throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOT_PINNED);
      }

      const participant =
        await this.prisma.directConversationParticipant.findUnique({
          where: {
            conversationId_userId: {
              conversationId: directMessage.conversationId,
              userId,
            },
          },
        });

      if (!participant) {
        throw new BadRequestException(
          MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CONVERSATION,
        );
      }

      return this.prisma.directMessage.update({
        where: { id: messageId },
        data: { pinned: false },
        include: {
          medias: true,
          replyTo: true,
          threadFollowers: true,
        },
      });
    }

    if (!message.pinned) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOT_PINNED);
    }

    const member = (await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: message.channelId, userId } },
      include: { channel: { include: { setting: true } } },
    })) as any;

    if (!member) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_GROUP);
    }

    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: member.channel.spaceId,
          userId,
        },
      },
    });

    if (!spaceMember) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_SPACE,
      );
    }

    if (
      spaceMember.role === SpaceRole.MEMBER &&
      member.channel.setting &&
      !member.channel.setting.allowPinMessage
    ) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.PIN_DISABLED,
      );
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

  async getPinnedMessages(
    channelId: string,
    cursor?: string,
    limit: number = MESSAGE_CONSTANTS.DEFAULT_LIMIT,
  ) {
    const isDirect = await this.prisma.directConversation.findUnique({
      where: { id: channelId },
    });

    if (isDirect) {
      const messages = await this.prisma.directMessage.findMany({
        where: {
          conversationId: channelId,
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

      let nextCursor: string | undefined = undefined;
      if (messages.length > limit) {
        const nextItem = messages.pop();
        nextCursor = nextItem?.id;
      }

      return {
        messages: messages.map((message) => ({
          ...message,
          channelId: message.conversationId,
          medias: mapMediaWithUrl(message.medias),
        })),
        nextCursor,
      };
    }

    const messages = await this.prisma.message.findMany({
      where: {
        channelId,
        pinned: true,
        threadParentId: null,
      },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
        replyTo: true,
      },
    });

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem?.id;
    }

    return {
      messages: messages.map((message) => ({
        ...message,
        medias: mapMediaWithUrl(message.medias),
      })),
      nextCursor,
    };
  }

  async getThreadFollowers(messageId: string): Promise<string[]> {
    const followers = await this.prisma.threadFollower.findMany({
      where: { messageId },
      select: { userId: true },
    });
    if (followers.length > 0) {
      return followers.map((f) => f.userId);
    }

    const directFollowers = await this.prisma.directThreadFollower.findMany({
      where: { messageId },
      select: { userId: true },
    });
    return directFollowers.map((f) => f.userId);
  }

  async addThreadFollower(messageId: string, userId: string): Promise<void> {
    const exists = await this.prisma.threadFollower.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });
    if (!exists) {
      await this.prisma.threadFollower.create({
        data: {
          messageId,
          userId,
        },
      });
    }
  }
}
