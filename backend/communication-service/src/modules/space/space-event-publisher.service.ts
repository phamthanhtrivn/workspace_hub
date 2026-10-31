import { SystemMessageService } from '../message/system-message.service';
import { Injectable, Inject } from '@nestjs/common';
import { DurableKafkaProducer } from '../../infrastructure/kafka/durable-kafka-producer';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SpaceRole } from '@prisma/client';
import {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
} from '../../common/constants/kafka.constants';
import { UserProfileSnapshot } from '../../common/types/user.types';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { UserProfileSnapshotResponse } from '../user-profile-snapshot/types/user-profile-snapshot.types';
import { SPACE_SOCKET_EVENT_TYPE } from './types/space.enums';
import { SpacePresentationService } from './space-presentation.service';

@Injectable()
export class SpaceEventPublisher {
  constructor(
    private readonly systemMessages: SystemMessageService,
    private readonly chatSocketPublisher: ChatSocketPublisher,
    @Inject('KAFKA_PRODUCER')
    private readonly kafkaClient: DurableKafkaProducer,
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly presentation: SpacePresentationService,
  ) {}
  emitSpaceMemberRemoved(
    spaceId: string,
    channelIds: string[],
    userId: string,
    leftSpace: boolean,
  ) {
    this.chatSocketPublisher.publishMemberLeft([userId, ...channelIds], {
      eventType: leftSpace
        ? SPACE_SOCKET_EVENT_TYPE.MEMBER_LEFT
        : 'member_left',
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      spaceId,
      channelId: channelIds[0] ?? null,
      userId,
      affectedUserIds: [userId],
      leftSpace,
    });
  }

  async emitSpaceInvitation(
    invitation: {
      invitedUserId: string;
      invitedBy: string;
      id: string;
      spaceId: string;
    },
    spaceName?: string | null,
    fallbackSnapshot?: UserProfileSnapshot | null,
    transaction?: Prisma.TransactionClient,
  ) {
    const inviterProfile =
      (await this.presentation.getProfileMap([invitation.invitedBy])).get(
        invitation.invitedBy,
      ) ??
      ({
        id: invitation.invitedBy,
        userId: invitation.invitedBy,
        email: null,
        fullName: fallbackSnapshot?.fullName ?? null,
        avatarUrl: fallbackSnapshot?.avatarUrl ?? null,
      } satisfies UserProfileSnapshotResponse);
    const inviterName = this.presentation.getProfileDisplayName(
      inviterProfile,
      invitation.invitedBy,
    );

    await firstValueFrom(
      this.kafkaClient.emit(
        KAFKA_TOPICS.NOTIFICATION_TOPIC,
        {
          key: invitation.invitedUserId,
          value: {
            recipientId: invitation.invitedUserId,
            senderId: invitation.invitedBy,
            senderName: inviterName,
            senderAvatar: inviterProfile?.avatarUrl,
            type: KAFKA_EVENTS.NOTIFICATION.SPACE_INVITATION,
            title: 'Space invitation',
            content: `You were invited to join ${spaceName} by ${inviterName}`,
            link: '/chat',
            metadata: {
              invitationId: invitation.id,
              spaceId: invitation.spaceId,
              spaceName,
              senderProfile: {
                userId: invitation.invitedBy,
                fullName: inviterProfile.fullName,
                avatarUrl: inviterProfile.avatarUrl,
              },
            },
          },
        },
        transaction,
      ),
    );
  }

  publishSpaceActionNotification(params: {
    recipientId: string;
    actorId: string;
    actorName?: string | null;
    actorAvatar?: string | null;
    type: string;
    title: string;
    content: string;
    metadata: Record<string, unknown>;
  }) {
    this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
      key: params.recipientId,
      value: {
        recipientId: params.recipientId,
        senderId: params.actorId,
        senderName: params.actorName,
        senderAvatar: params.actorAvatar,
        type: params.type,
        title: params.title,
        content: params.content,
        link: '/chat',
        metadata: params.metadata,
      },
    });
  }

  publishSpaceActionNotifications(params: {
    recipientIds: string[];
    actorId: string;
    actorName?: string | null;
    actorAvatar?: string | null;
    type: string;
    title: string;
    content: string;
    metadata: Record<string, unknown>;
  }) {
    for (const recipientId of new Set(params.recipientIds)) {
      if (!recipientId || recipientId === params.actorId) continue;
      this.publishSpaceActionNotification({
        recipientId,
        actorId: params.actorId,
        actorName: params.actorName,
        actorAvatar: params.actorAvatar,
        type: params.type,
        title: params.title,
        content: params.content,
        metadata: params.metadata,
      });
    }
  }

  async publishSpaceRenamed(spaceId: string, name: string, actorId: string) {
    const defaultChannel = await this.prisma.channel.findFirst({
      where: { spaceId, isDefault: true },
    });

    if (defaultChannel) {
      const profileMap =
        await this.userProfileSnapshotService.getProfilesByUserIds([actorId]);
      const actorProfile = profileMap.get(actorId);
      const content = `Space name was updated to "${name}" by ${actorProfile?.fullName || 'an admin'}`;
      await this.systemMessages.sendSystemMessage(
        defaultChannel.id,
        actorId,
        content,
      );
    }

    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });

    this.chatSocketPublisher.publishToRooms(
      members.map((member) => member.userId),
      ChatEvent.CHANNEL_SETTING_UPDATED,
      {
        eventType: 'space_updated',
        spaceId,
        name,
      },
    );
  }

  async publishProjectSpaceMembersJoined(result: {
    spaceId: string;
    channelId: string;
    joinedMembers?: { userId: string; role: SpaceRole }[];
  }) {
    const joinedMembers = result.joinedMembers ?? [];
    if (joinedMembers.length === 0) return;

    const allMembers = await this.prisma.spaceMember.findMany({
      where: { spaceId: result.spaceId },
      select: { userId: true },
    });
    const targetRooms = [
      result.channelId,
      ...allMembers.map((member) => member.userId),
    ];

    for (const member of joinedMembers) {
      this.chatSocketPublisher.publishMemberJoin(targetRooms, {
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: result.channelId,
        spaceId: result.spaceId,
        userId: member.userId,
        member: {
          channelId: result.channelId,
          userId: member.userId,
          role: member.role,
        },
      });
    }
  }

  async publishProjectSpaceMembersRemoved(result: {
    spaceId: string;
    channelId: string;
    channelIds?: string[];
    removedMembers?: { userId: string }[];
  }) {
    const removedMembers = result.removedMembers ?? [];
    if (removedMembers.length === 0) return;

    const remainingMembers = await this.prisma.spaceMember.findMany({
      where: { spaceId: result.spaceId },
      select: { userId: true },
    });
    const targetRooms = [
      ...remainingMembers.map((member) => member.userId),
      ...(result.channelIds ?? [result.channelId]),
    ];

    for (const member of removedMembers) {
      this.chatSocketPublisher.publishMemberKicked(
        [...new Set([member.userId, ...targetRooms])],
        {
          eventType: SPACE_SOCKET_EVENT_TYPE.MEMBER_REMOVED,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          spaceId: result.spaceId,
          channelId: result.channelId,
          channelIds: [result.channelId],
          userId: member.userId,
          affectedUserIds: [member.userId],
          leftSpace: true,
        },
      );
    }
  }
}
