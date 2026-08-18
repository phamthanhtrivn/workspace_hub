import { BadRequestException, Injectable } from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatEvent } from '../chat/chat.events';
import { CHAT_CONTEXT_TYPE } from '../chat/types/chat.enums';
import { CHANNEL_ERROR_MESSAGES } from '../channel/types/channel.enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';

@Injectable()
export class DirectConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}

  async createDirectConversation(userId: string, participantId: string) {
    if (userId === participantId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.SELF_CONVERSATION);
    }

    const existingConversation = await this.prisma.directConversation.findFirst(
      {
        where: {
          AND: [
            {
              participants: {
                some: {
                  userId,
                },
              },
            },
            {
              participants: {
                some: {
                  userId: participantId,
                },
              },
            },
          ],
        },
        include: {
          participants: true,
        },
      },
    );

    if (existingConversation) {
      return this.mapDirectConversation(existingConversation, userId);
    }

    const conversation = await this.prisma.directConversation.create({
      data: {
        participants: {
          create: [
            {
              userId,
            },
            {
              userId: participantId,
            },
          ],
        },
      },
      include: {
        participants: true,
      },
    });

    return this.mapDirectConversation(conversation, userId);
  }

  async getUserDirectConversations(userId: string, search?: string) {
    const normalizedSearch = search?.trim();
    const matchingUserIds = normalizedSearch
      ? await this.getMatchingDirectParticipantIds(userId, normalizedSearch)
      : null;

    if (matchingUserIds && matchingUserIds.length === 0) {
      return [];
    }

    const conversations = await this.prisma.directConversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
        ...(matchingUserIds
          ? {
              AND: [
                {
                  participants: {
                    some: {
                      userId: {
                        in: matchingUserIds,
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        participants: true,
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            medias: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const mappedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const participant = conversation.participants.find(
          (item) => item.userId === userId,
        );
        let unreadCount = 0;

        if (participant) {
          const referenceDate = participant.lastReadAt || participant.joinedAt;
          unreadCount = await this.prisma.directMessage.count({
            where: {
              conversationId: conversation.id,
              createdAt: {
                gt: referenceDate,
              },
              senderId: {
                not: userId,
              },
            },
          });
        }

        return this.mapDirectConversation(conversation, userId, unreadCount);
      }),
    );

    return mappedConversations.sort((a, b) => {
      const aPinned = a.members?.find(
        (member) => member.userId === userId,
      )?.pinned;
      const bPinned = b.members?.find(
        (member) => member.userId === userId,
      )?.pinned;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  private async getMatchingDirectParticipantIds(
    currentUserId: string,
    search: string,
  ) {
    const snapshots = await this.prisma.userProfileSnapshot.findMany({
      where: {
        userId: {
          not: currentUserId,
        },
        OR: [
          {
            fullName: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        userId: true,
      },
    });

    return snapshots.map((snapshot) => snapshot.userId);
  }

  async muteDirectConversation(
    conversationId: string,
    userId: string,
    muted: boolean,
  ) {
    const participant =
      await this.prisma.directConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

    if (!participant) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
    }

    const updatedParticipant =
      await this.prisma.directConversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: { muted },
      });

    if (this.chatGateway?.server) {
      this.chatGateway.server
        .to(userId)
        .emit(ChatEvent.CONVERSATION_MUTE_UPDATED, {
          chatId: conversationId,
          chatType: CHAT_CONTEXT_TYPE.DIRECT_MESSAGE,
          conversationId,
          muted,
        });
    }

    return updatedParticipant;
  }

  async pinDirectConversation(
    conversationId: string,
    userId: string,
    pinned: boolean,
  ) {
    const participant =
      await this.prisma.directConversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      });

    if (!participant) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
    }

    const updatedParticipant =
      await this.prisma.directConversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: { pinned },
      });

    return updatedParticipant;
  }

  private async mapDirectConversation(
    conversation: any,
    _userId: string,
    unreadCount = 0,
  ) {
    const members = conversation.participants.map((participant) => ({
      ...participant,
      role: SpaceRole.MEMBER,
    }));
    const enrichedMembers =
      await this.userProfileSnapshotService.attachProfilesToMembers(members);
    const enrichedMessages =
      await this.userProfileSnapshotService.attachSenderProfilesToMessages(
        conversation.messages ?? [],
      );

    return {
      ...conversation,
      members: enrichedMembers,
      messages: enrichedMessages,
      setting: {
        allowSendMessage: true,
        allowCreateNote: true,
        allowCreatePoll: true,
        allowPinMessage: true,
      },
      unreadCount,
    };
  }
}
