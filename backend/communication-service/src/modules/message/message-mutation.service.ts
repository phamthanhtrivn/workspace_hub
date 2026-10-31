import { assertClientMessageType } from '../../common/auth/client-message-type';
import { ConversationAiService } from '../conversation-ai/conversation-ai.service';
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChannelVisibility, MessageType, SpaceRole } from '@prisma/client';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { getMediaType } from '../../common/utils/file.util';
import { MESSAGE_ERROR_MESSAGES } from './types/message.enums';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { isTaskCardContent } from './utils/is-task-card-content';

@Injectable()
export class MessageMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly conversationAi: ConversationAiService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
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
    threadParentId?: string,
    attachmentMediaId?: string,
  ) {
    assertClientMessageType(type, true);
    const createdMessage = await this.prisma.$transaction(async (tx) => {
      if (type !== MessageType.SYSTEM) {
        const member = await tx.channelMember.findUnique({
          where: { channelId_userId: { channelId, userId: senderId } },
          include: {
            channel: {
              include: {
                setting: true,
                space: { select: { createdBy: true } },
              },
            },
          },
        });

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

        if (
          (member.channel.visibility === ChannelVisibility.PRIVATE
            ? member.channel.ownerId !== senderId
            : spaceMember.role === SpaceRole.MEMBER &&
              member.channel.space.createdBy !== senderId) &&
          member.channel.setting
        ) {
          const setting = member.channel.setting;
          if (
            (type === MessageType.TEXT || type === MessageType.DOCUMENT) &&
            !setting.allowSendMessage
          ) {
            throw new BadRequestException(
              MESSAGE_ERROR_MESSAGES.MESSAGE_DISABLED,
            );
          }
          if (type === MessageType.POLL && !setting.allowCreatePoll) {
            throw new BadRequestException(MESSAGE_ERROR_MESSAGES.POLL_DISABLED);
          }
          if (type === MessageType.NOTE && !setting.allowCreateNote) {
            throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOTE_DISABLED);
          }
          if (!setting.allowCreateTask && isTaskCardContent(type, content)) {
            throw new BadRequestException(MESSAGE_ERROR_MESSAGES.TASK_DISABLED);
          }
        }
      }

      if (medias?.length)
        await this.s3Service.assertAttachments(medias, {
          actorId: senderId,
          referenceId: channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        });

      if (threadParentId) {
        const parentMsg = await tx.message.findUnique({
          where: { id: threadParentId },
        });
        if (
          !parentMsg ||
          parentMsg.channelId !== channelId ||
          parentMsg.deletedAt ||
          parentMsg.recalled
        ) {
          throw new BadRequestException(
            MESSAGE_ERROR_MESSAGES.PARENT_NOT_FOUND,
          );
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

      await this.conversationAi.register(
        message,
        senderId,
        channelId,
        'CHANNEL',
        tx,
        attachmentMediaId,
      );
      return message;
    });
    this.conversationAi.notify(createdMessage);

    return this.userProfileSnapshotService.attachSenderProfileToMessage(
      createdMessage,
    );
  }

  async followThread(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
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
      await this.prisma.threadFollower.update({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
        data: { lastReadAt: new Date() },
      });
      return { following: true };
    }

    await this.prisma.threadFollower.create({
      data: {
        messageId,
        userId,
        lastReadAt: new Date(),
      },
    });
    return { following: true };
  }

  async unfollowThread(userId: string, messageId: string) {
    await this.prisma.threadFollower.deleteMany({
      where: { messageId, userId },
    });
    return { following: false };
  }

  async markThreadAsRead(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, channelId: true },
    });

    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    const member = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId: message.channelId,
          userId,
        },
      },
    });

    if (!member) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
    }

    const lastReadAt = new Date();
    await this.prisma.threadFollower.updateMany({
      where: { messageId, userId },
      data: { lastReadAt },
    });

    return { messageId, lastReadAt };
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
    channelId: string,
    userId: string,
    messageId: string,
  ) {
    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
      select: { id: true },
    });
    if (!member)
      throw new ForbiddenException(
        MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, channelId, deletedAt: null },
      select: { id: true },
    });
    if (!message)
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
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
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException(MESSAGE_ERROR_MESSAGES.EDIT_OWNER_REQUIRED);
    }

    if (message.type !== MessageType.TEXT) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.TEXT_EDIT_REQUIRED);
    }

    if (content.trim().length === 0) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.CONTENT_REQUIRED);
    }

    if (isTaskCardContent(MessageType.TEXT, content) && message.channelId) {
      const channelMember = await this.prisma.channelMember.findUnique({
        where: {
          channelId_userId: { channelId: message.channelId, userId },
        },
        include: {
          channel: {
            include: { setting: true, space: { select: { createdBy: true } } },
          },
        },
      });
      if (channelMember?.channel.setting?.allowCreateTask === false) {
        const spaceMember = await this.prisma.spaceMember.findUnique({
          where: {
            spaceId_userId: {
              spaceId: channelMember.channel.spaceId,
              userId,
            },
          },
        });
        if (
          channelMember.channel.visibility === ChannelVisibility.PRIVATE
            ? channelMember.channel.ownerId !== userId
            : spaceMember?.role === SpaceRole.MEMBER &&
              channelMember.channel.space.createdBy !== userId
        ) {
          throw new BadRequestException(MESSAGE_ERROR_MESSAGES.TASK_DISABLED);
        }
      }
    }

    const now = new Date().getTime();
    const createdAt = new Date(message.createdAt).getTime();
    const hoursDifference = (now - createdAt) / (1000 * 60 * 60);

    if (hoursDifference > 24) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.EDIT_WINDOW_EXPIRED);
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
      },
    });
  }

  async recallMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { medias: true },
    });

    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException(
        MESSAGE_ERROR_MESSAGES.RECALL_OWNER_REQUIRED,
      );
    }

    const now = new Date();
    const createdAt = new Date(message.createdAt);
    if (now.getTime() - createdAt.getTime() > 24 * 60 * 60 * 1000) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.RECALL_WINDOW_EXPIRED,
      );
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

    // Delete other associated records (reactions, thread followers, polls, notes)
    await Promise.all([
      this.prisma.reaction.deleteMany({ where: { messageId } }),
      this.prisma.threadFollower.deleteMany({ where: { messageId } }),
      this.prisma.poll.deleteMany({ where: { messageId } }),
      this.prisma.note.deleteMany({ where: { messageId } }),
    ]);

    // Mark message as recalled, clear content, and unpin
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        recalled: true,
        content: null,
        pinned: false,
      },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
      },
    });
  }

  async pinMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    if (message.pinned) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.ALREADY_PINNED);
    }

    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: message.channelId, userId } },
      include: { channel: { include: { setting: true } } },
    });

    if (!member) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
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
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_SPACE);
    }

    if (
      (member.channel.visibility === ChannelVisibility.PRIVATE
        ? member.channel.ownerId !== userId
        : spaceMember.role === SpaceRole.MEMBER) &&
      member.channel.setting &&
      !member.channel.setting.allowPinMessage
    ) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.PIN_DISABLED);
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { pinned: true },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
      },
    });
  }

  async unpinMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    }

    if (!message.pinned) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOT_PINNED);
    }

    const member = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: message.channelId, userId } },
      include: { channel: { include: { setting: true } } },
    });

    if (!member) {
      throw new BadRequestException(
        MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
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
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.NOT_MEMBER_OF_SPACE);
    }

    if (
      (member.channel.visibility === ChannelVisibility.PRIVATE
        ? member.channel.ownerId !== userId
        : spaceMember.role === SpaceRole.MEMBER) &&
      member.channel.setting &&
      !member.channel.setting.allowPinMessage
    ) {
      throw new BadRequestException(MESSAGE_ERROR_MESSAGES.PIN_DISABLED);
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { pinned: false },
      include: {
        medias: true,
        poll: { include: { options: { include: { votes: true } } } },
        note: true,
      },
    });
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
