import { assertClientMessageType } from '../../common/auth/client-message-type';
import { ConversationAiService } from '../conversation-ai/conversation-ai.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { getMediaType } from '../../common/utils/file.util';
import { MESSAGE_ERROR_MESSAGES } from '../message/types/message.enums';
import {
  CHAT_CONTEXT_TYPE,
  CHAT_REACTION_ACTION,
} from '../../common/types/chat.enums';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { DirectMessagePermissionService } from './direct-message-permission.service';
import { DirectMessagePresentationService } from './direct-message-presentation.service';
import { DirectMessageEventPublisher } from './direct-message-event-publisher.service';
import { DirectMessageAccessService } from './direct-message-access.service';
import { DirectMessageQueryService } from './direct-message-query.service';

@Injectable()
export class DirectMessageMutationService {
  constructor(
    private readonly directMessagePermissionService: DirectMessagePermissionService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    private readonly conversationAi: ConversationAiService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly chatSocketPublisher: ChatSocketPublisher,
    private readonly presentation: DirectMessagePresentationService,
    private readonly events: DirectMessageEventPublisher,
    private readonly access: DirectMessageAccessService,
    private readonly queries: DirectMessageQueryService,
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
    mentions?: string[],
    attachmentMediaId?: string,
  ) {
    assertClientMessageType(type);
    await this.directMessagePermissionService.assertCanSend(
      conversationId,
      senderId,
    );
    if (medias?.length)
      await this.s3Service.assertAttachments(medias, {
        actorId: senderId,
        referenceId: conversationId,
        chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
      });
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

      await this.conversationAi.register(
        message,
        senderId,
        conversationId,
        'DIRECT_MESSAGE',
        tx,
        attachmentMediaId,
      );
      return this.presentation.mapDirectMessage(message);
    });
    this.conversationAi.notify(createdMessage);

    const message =
      await this.userProfileSnapshotService.attachSenderProfileToMessage(
        createdMessage,
      );

    await this.events.publishDirectMessageCreated(conversationId, message, {
      medias,
      threadParentId,
      mentions,
    });

    return message;
  }

  async markDirectConversationAsRead(
    conversationId: string,
    userId: string,
    messageId: string,
  ) {
    await this.directMessagePermissionService.assertCanRead(
      conversationId,
      userId,
    );
    const message = await this.prisma.directMessage.findFirst({
      where: { id: messageId, conversationId, deletedAt: null },
      select: { id: true },
    });
    if (!message)
      throw new NotFoundException(MESSAGE_ERROR_MESSAGES.MESSAGE_NOT_FOUND);
    const result = await this.prisma.directConversationParticipant.update({
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

    await this.chatSocketPublisher.publishDirectMessageRead(conversationId, {
      messageId,
      userId,
      readAt: result.lastReadAt,
    });

    return result;
  }

  async addDirectReaction(messageId: string, userId: string, emoji: string) {
    await this.access.assertDirectMessageMember(messageId, userId);
    const existing = await this.prisma.directReaction.findFirst({
      where: { messageId, userId },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        await this.prisma.directReaction.delete({ where: { id: existing.id } });
        const result = { action: 'remove', emoji };
        await this.events.publishDirectReactionUpdated(
          messageId,
          userId,
          result,
        );
        return result;
      }

      await this.prisma.directReaction.update({
        where: { id: existing.id },
        data: { emoji },
      });
      const result = { action: 'update', emoji };
      await this.events.publishDirectReactionUpdated(messageId, userId, result);
      return result;
    }

    await this.prisma.directReaction.create({
      data: { messageId, userId, emoji },
    });
    const result = { action: 'add', emoji };
    await this.events.publishDirectReactionUpdated(messageId, userId, result);
    return result;
  }

  async removeDirectReaction(messageId: string, userId: string, emoji: string) {
    await this.access.assertDirectMessageMember(messageId, userId);
    const result = await this.prisma.directReaction.deleteMany({
      where: { messageId, userId, emoji },
    });
    const conversationId =
      await this.queries.getDirectMessageConversationId(messageId);

    await this.chatSocketPublisher.publishDirectReactionUpdated(
      conversationId,
      {
        messageId,
        userId,
        emoji,
        action: CHAT_REACTION_ACTION.REMOVE,
      },
    );

    return result;
  }

  async editDirectMessage(messageId: string, content: string, userId: string) {
    const message = await this.access.getOwnedDirectMessage(messageId, userId);
    if (message.type !== MessageType.TEXT) {
      throw new BadRequestException('Only text messages can be edited');
    }
    if (content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }
    this.access.assertWithin24Hours(
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
    const mappedMessage = this.presentation.mapDirectMessage(updatedMessage);
    await this.events.publishDirectMessageUpdate(
      ChatEvent.MESSAGE_UPDATED,
      mappedMessage,
    );
    return mappedMessage;
  }

  async recallDirectMessage(messageId: string, userId: string) {
    const message = await this.access.getOwnedDirectMessage(messageId, userId, {
      medias: true,
    });
    this.access.assertWithin24Hours(
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
    const mappedMessage = this.presentation.mapDirectMessage(updatedMessage);
    await this.events.publishDirectMessageUpdate(
      ChatEvent.MESSAGE_UPDATED,
      mappedMessage,
    );
    return mappedMessage;
  }

  async deleteDirectMessage(messageId: string, userId: string) {
    await this.access.getOwnedDirectMessage(messageId, userId);
    const deletedMessage = await this.prisma.directMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: {
        reactions: true,
        medias: true,
        threadFollowers: true,
      },
    });
    const mappedMessage = this.presentation.mapDirectMessage(deletedMessage);
    await this.events.publishDirectMessageUpdate(
      ChatEvent.MESSAGE_UPDATED,
      mappedMessage,
    );
    return mappedMessage;
  }

  async pinDirectMessage(messageId: string, userId: string) {
    const message = await this.access.assertDirectMessageMember(
      messageId,
      userId,
    );
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
    const mappedMessage = this.presentation.mapDirectMessage(updatedMessage);
    await this.events.publishDirectMessageUpdate(
      ChatEvent.MESSAGE_PINNED,
      mappedMessage,
    );
    return mappedMessage;
  }

  async unpinDirectMessage(messageId: string, userId: string) {
    const message = await this.access.assertDirectMessageMember(
      messageId,
      userId,
    );
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
    const mappedMessage = this.presentation.mapDirectMessage(updatedMessage);
    await this.events.publishDirectMessageUpdate(
      ChatEvent.MESSAGE_UNPINNED,
      mappedMessage,
    );
    return mappedMessage;
  }

  async followDirectThread(messageId: string, userId: string) {
    await this.access.assertDirectMessageMember(messageId, userId);
    await this.prisma.directThreadFollower.upsert({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
      update: { lastReadAt: new Date() },
      create: { messageId, userId, lastReadAt: new Date() },
    });
    return { following: true };
  }

  async unfollowDirectThread(messageId: string, userId: string) {
    await this.access.assertDirectMessageMember(messageId, userId);
    await this.prisma.directThreadFollower.deleteMany({
      where: { messageId, userId },
    });
    return { following: false };
  }

  async markDirectThreadAsRead(messageId: string, userId: string) {
    await this.access.assertDirectMessageMember(messageId, userId);
    const lastReadAt = new Date();
    await this.prisma.directThreadFollower.updateMany({
      where: { messageId, userId },
      data: { lastReadAt },
    });
    return { messageId, lastReadAt };
  }
}
