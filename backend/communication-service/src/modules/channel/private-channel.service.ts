import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ChannelVisibility, Message, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import {
  CHANNEL_ERROR_MESSAGES,
  PRIVATE_CHANNEL_EVENT_TYPE,
  PRIVATE_CHANNEL_REMOVAL_NOTIFICATION,
} from './types/channel.enums';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
} from '../../common/constants/kafka.constants';
import {
  createPrivateChannelSystemMessages,
  publishPrivateChannelSystemMessages,
} from './private-channel-system-messages';
import { PrivateChannelMembershipAction } from './types/private-channel-system-message.types';
import {
  createPrivateChannelOwnershipNotification,
  PrivateChannelOwnershipNotification,
} from './private-channel-ownership-notification';

export interface PrivateMembershipChange {
  id: string;
  spaceId: string;
  ownerId: string | null;
  deleted: boolean;
  removedUserIds: string[];
  memberUserIds: string[];
  systemMessages: Message[];
  ownershipNotification: PrivateChannelOwnershipNotification;
  leaving?: boolean;
}

// Called inside the same transaction as space/project membership removal.
export async function reconcilePrivateMemberships(
  tx: Prisma.TransactionClient,
  spaceId: string,
  removedUserIds: string[],
  context: { actorId?: string; action: PrivateChannelMembershipAction } = {
    action: PrivateChannelMembershipAction.PROJECT_REMOVED,
  },
): Promise<PrivateMembershipChange[]> {
  if (!removedUserIds.length) return [];
  const channels = await tx.channel.findMany({
    where: {
      spaceId,
      visibility: ChannelVisibility.PRIVATE,
      members: { some: { userId: { in: removedUserIds } } },
    },
    include: { members: { orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] } },
  });
  const changes: PrivateMembershipChange[] = [];
  for (const channel of channels) {
    if (channel.visibility !== ChannelVisibility.PRIVATE) continue;
    const remaining = channel.members.filter(
      (member) => !removedUserIds.includes(member.userId),
    );
    const ownerId = remaining.some(
      (member) => member.userId === channel.ownerId,
    )
      ? channel.ownerId
      : (remaining[0]?.userId ?? null);
    if (!remaining.length)
      await tx.channel.delete({ where: { id: channel.id } });
    else if (ownerId !== channel.ownerId)
      await tx.channel.update({ where: { id: channel.id }, data: { ownerId } });
    const removedIds = channel.members
      .filter((member) => removedUserIds.includes(member.userId))
      .map((member) => member.userId);
    const systemMessages = remaining.length
      ? await createPrivateChannelSystemMessages(
          tx,
          channel.id,
          context.actorId ?? removedIds[0],
          [
            ...removedIds.map((userId) => ({ userId, action: context.action })),
            ...(ownerId && ownerId !== channel.ownerId
              ? [
                  {
                    userId: ownerId,
                    action: PrivateChannelMembershipAction.OWNER_TRANSFERRED,
                  },
                ]
              : []),
          ],
        )
      : [];
    changes.push({
      id: channel.id,
      spaceId,
      ownerId,
      deleted: !remaining.length,
      removedUserIds: channel.members
        .filter((member) => removedUserIds.includes(member.userId))
        .map((member) => member.userId),
      memberUserIds: remaining.map((member) => member.userId),
      systemMessages,
      ownershipNotification: await createPrivateChannelOwnershipNotification(
        tx,
        channel,
        ownerId,
      ),
    });
  }
  return changes;
}

export function publishPrivateMembershipChanges(
  publisher: ChatSocketPublisher,
  changes: PrivateMembershipChange[],
  kafka: ClientKafka,
) {
  for (const change of changes) {
    for (const userId of change.removedUserIds) {
      publisher.removeUserFromChannel(userId, change.id);
      const payload = {
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: change.id,
        spaceId: change.spaceId,
        userId,
        leftSpace: false,
      };
      const rooms = [userId, ...change.memberUserIds];
      if (change.leaving) publisher.publishMemberLeft(rooms, payload);
      else publisher.publishMemberKicked(rooms, payload);
    }
    if (!change.deleted)
      publisher.publishToRooms(
        change.memberUserIds,
        ChatEvent.CHANNEL_SETTING_UPDATED,
        {
          eventType: PRIVATE_CHANNEL_EVENT_TYPE.MEMBERS_CHANGED,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId: change.id,
          spaceId: change.spaceId,
        },
      );
    publishPrivateChannelSystemMessages(
      publisher,
      change.systemMessages,
      change.memberUserIds,
    );
    if (change.ownershipNotification) {
      kafka.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: change.ownershipNotification.recipientId,
        value: change.ownershipNotification,
      });
    }
  }
}

@Injectable()
export class PrivateChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: ChatSocketPublisher,
    private readonly profiles: UserProfileSnapshotService,
    @Inject('KAFKA_PRODUCER') private readonly kafka: ClientKafka,
  ) {}

  async addMembers(channelId: string, actorId: string, userIds: string[]) {
    const added = await this.prisma.$transaction(
      async (tx) => {
        const channel = await this.requireOwner(tx, channelId, actorId);
        const uniqueIds = [...new Set(userIds)];
        const valid = await tx.spaceMember.count({
          where: { spaceId: channel.spaceId, userId: { in: uniqueIds } },
        });
        if (valid !== uniqueIds.length)
          throw new BadRequestException(CHANNEL_ERROR_MESSAGES.INVALID_MEMBERS);
        const existing = await tx.channelMember.findMany({
          where: { channelId, userId: { in: uniqueIds } },
          select: { userId: true },
        });
        const addedIds = uniqueIds.filter(
          (id) => !existing.some((member) => member.userId === id),
        );
        await tx.channelMember.createMany({
          data: addedIds.map((userId) => ({ channelId, userId })),
          skipDuplicates: true,
        });
        const systemMessages = await createPrivateChannelSystemMessages(
          tx,
          channelId,
          actorId,
          addedIds.map((userId) => ({
            userId,
            action: PrivateChannelMembershipAction.ADDED,
          })),
        );
        return { channel, addedIds, systemMessages };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const memberUserIds = await this.notifyAdded(
      added.channel,
      actorId,
      added.addedIds,
    );
    publishPrivateChannelSystemMessages(
      this.publisher,
      added.systemMessages,
      memberUserIds,
    );
    return { count: added.addedIds.length };
  }

  async removeMember(
    channelId: string,
    actorId: string,
    userId: string,
    leaving = false,
  ) {
    const { channel, changes } = await this.prisma.$transaction(
      async (tx) => {
        const channel = await tx.channel.findUnique({
          where: { id: channelId },
        });
        if (!channel || channel.visibility !== ChannelVisibility.PRIVATE)
          throw new NotFoundException(
            CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED,
          );
        if (!leaving) {
          await this.requireOwner(tx, channelId, actorId);
          if (userId === channel.ownerId)
            throw new BadRequestException(
              CHANNEL_ERROR_MESSAGES.OWNER_CANNOT_BE_REMOVED,
            );
        } else if (actorId !== userId)
          throw new ForbiddenException(
            CHANNEL_ERROR_MESSAGES.PRIVATE_OWNER_REQUIRED,
          );
        const member = await tx.channelMember.findUnique({
          where: { channelId_userId: { channelId, userId } },
        });
        if (!member)
          throw new NotFoundException(
            CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED,
          );
        // Reconcile only this channel; leaving must not change other memberships.
        const remaining = await tx.channelMember.findMany({
          where: { channelId, userId: { not: userId } },
          orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
        });
        const ownerId =
          channel.ownerId === userId
            ? (remaining[0]?.userId ?? null)
            : channel.ownerId;
        if (!remaining.length)
          await tx.channel.delete({ where: { id: channelId } });
        else {
          await tx.channelMember.delete({ where: { id: member.id } });
          if (ownerId !== channel.ownerId)
            await tx.channel.update({
              where: { id: channelId },
              data: { ownerId },
            });
        }
        const systemMessages = remaining.length
          ? await createPrivateChannelSystemMessages(tx, channelId, actorId, [
              {
                userId,
                action: leaving
                  ? PrivateChannelMembershipAction.LEFT
                  : PrivateChannelMembershipAction.REMOVED,
              },
              ...(ownerId && ownerId !== channel.ownerId
                ? [
                    {
                      userId: ownerId,
                      action: PrivateChannelMembershipAction.OWNER_TRANSFERRED,
                    },
                  ]
                : []),
            ])
          : [];
        return {
          channel,
          changes: [
            {
              id: channelId,
              spaceId: channel.spaceId,
              ownerId,
              deleted: !remaining.length,
              memberUserIds: remaining.map((entry) => entry.userId),
              removedUserIds: [userId],
              systemMessages,
              ownershipNotification:
                await createPrivateChannelOwnershipNotification(
                  tx,
                  channel,
                  ownerId,
                ),
              leaving,
            },
          ],
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    publishPrivateMembershipChanges(this.publisher, changes, this.kafka);
    if (!leaving) await this.notifyRemoved(channel, actorId, userId);
    return { success: true };
  }

  private async notifyRemoved(
    channel: { id: string; name: string; spaceId: string },
    actorId: string,
    recipientId: string,
  ) {
    const [profiles, space] = await Promise.all([
      this.profiles.getProfilesByUserIds([actorId]),
      this.prisma.space.findUnique({
        where: { id: channel.spaceId },
        select: { name: true },
      }),
    ]);
    const actor = profiles.get(actorId);
    const actorName = actor?.fullName || actor?.email || 'The channel owner';
    const spaceName = space?.name || 'your space';
    this.kafka.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
      key: recipientId,
      value: {
        recipientId,
        senderId: actorId,
        senderName: actorName,
        senderAvatar: actor?.avatarUrl,
        type: KAFKA_EVENTS.NOTIFICATION.CHANNEL_MEMBER_REMOVED,
        title: PRIVATE_CHANNEL_REMOVAL_NOTIFICATION.TITLE,
        content: PRIVATE_CHANNEL_REMOVAL_NOTIFICATION.CONTENT(
          actorName,
          channel.name,
          spaceName,
        ),
        metadata: {
          channelId: channel.id,
          channelName: channel.name,
          spaceId: channel.spaceId,
          spaceName,
          actorId,
          visibility: ChannelVisibility.PRIVATE,
        },
      },
    });
  }

  async notifyAdded(
    channel: { id: string; name: string; spaceId: string },
    actorId: string,
    userIds: string[],
  ) {
    if (!userIds.length) return [];
    const [profiles, space, members] = await Promise.all([
      this.profiles.getProfilesByUserIds([actorId]),
      this.prisma.space.findUnique({
        where: { id: channel.spaceId },
        select: { name: true },
      }),
      this.prisma.channelMember.findMany({
        where: { channelId: channel.id },
        select: { userId: true },
      }),
    ]);
    const actor = profiles.get(actorId);
    this.publisher.publishToRooms(
      members.map((member) => member.userId),
      ChatEvent.CHANNEL_SETTING_UPDATED,
      {
        eventType: PRIVATE_CHANNEL_EVENT_TYPE.MEMBERS_CHANGED,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId: channel.id,
        spaceId: channel.spaceId,
      },
    );
    for (const recipientId of userIds) {
      if (recipientId === actorId) continue;
      this.kafka.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: recipientId,
        value: {
          recipientId,
          senderId: actorId,
          senderName: actor?.fullName,
          senderAvatar: actor?.avatarUrl,
          type: KAFKA_EVENTS.NOTIFICATION.CHANNEL_MEMBER_ADDED,
          title: 'Added to a private channel',
          content: `${actor?.fullName || 'The channel owner'} added you to ${channel.name} in ${space?.name || 'your space'}`,
          link: `/chat?spaceId=${channel.spaceId}&channelId=${channel.id}`,
          metadata: {
            channelId: channel.id,
            channelName: channel.name,
            spaceId: channel.spaceId,
            spaceName: space?.name || 'your space',
            actorId,
            visibility: ChannelVisibility.PRIVATE,
          },
        },
      });
    }
    return members.map((member) => member.userId);
  }

  private async requireOwner(
    tx: Prisma.TransactionClient,
    channelId: string,
    actorId: string,
  ) {
    const channel = await tx.channel.findUnique({ where: { id: channelId } });
    if (
      !channel ||
      channel.visibility !== ChannelVisibility.PRIVATE ||
      channel.ownerId !== actorId
    )
      throw new ForbiddenException(
        CHANNEL_ERROR_MESSAGES.PRIVATE_OWNER_REQUIRED,
      );
    const member = await tx.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: actorId } },
    });
    const spaceMember = await tx.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId: actorId } },
    });
    if (!member || !spaceMember)
      throw new ForbiddenException(
        CHANNEL_ERROR_MESSAGES.PRIVATE_OWNER_REQUIRED,
      );
    return channel;
  }
}
