import { SystemMessageService } from '../message/system-message.service';
import {
  Injectable,
  BadRequestException,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { DurableKafkaProducer } from '../../infrastructure/kafka/durable-kafka-producer';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SpaceRole } from '@prisma/client';
import { KAFKA_EVENTS } from '../../common/constants/kafka.constants';
import {
  reconcilePrivateMemberships,
  publishPrivateMembershipChanges,
} from '../channel/private-channel.service';
import { PrivateChannelMembershipAction } from '../channel/types/private-channel-system-message.types';
import { CHAT_CONTEXT_TYPE } from '../../common/types/chat.enums';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';
import {
  SPACE_ERROR_MESSAGES,
  SPACE_SOCKET_EVENT_TYPE,
} from './types/space.enums';
import { SpaceAccessService } from './space-access.service';
import { SpacePresentationService } from './space-presentation.service';
import { SpaceEventPublisher } from './space-event-publisher.service';

@Injectable()
export class SpaceMembershipService {
  constructor(
    private readonly systemMessages: SystemMessageService,
    private readonly prisma: PrismaService,
    private readonly chatSocketPublisher: ChatSocketPublisher,
    @Inject('KAFKA_PRODUCER')
    private readonly kafkaClient: DurableKafkaProducer,
    private readonly access: SpaceAccessService,
    private readonly presentation: SpacePresentationService,
    private readonly events: SpaceEventPublisher,
  ) {}
  async transferSpaceOwnership(
    userId: string,
    spaceId: string,
    targetUserId: string,
  ) {
    await this.access.assertNotProjectSpace(spaceId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
    });
    if (!space) {
      throw new NotFoundException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }
    if (space.createdBy !== userId) {
      throw new ForbiddenException(
        SPACE_ERROR_MESSAGES.OWNER_TRANSFER_REQUIRED,
      );
    }
    if (userId === targetUserId) {
      throw new BadRequestException(
        SPACE_ERROR_MESSAGES.SELF_OWNERSHIP_TRANSFER,
      );
    }

    const targetMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
    });
    if (!targetMember) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }

    const [updatedSpace] = await this.prisma.$transaction(async (tx) => {
      const sp = await tx.space.update({
        where: { id: spaceId },
        data: { createdBy: targetUserId },
      });

      await tx.spaceMember.update({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
        data: { role: SpaceRole.ADMIN },
      });

      await tx.spaceMember.update({
        where: { spaceId_userId: { spaceId, userId } },
        data: { role: SpaceRole.MEMBER },
      });

      return [sp];
    });

    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });
    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });

    const profileByUserId = await this.presentation.getProfileMap([
      userId,
      targetUserId,
    ]);
    const actorProfile = profileByUserId.get(userId);
    const targetProfile = profileByUserId.get(targetUserId);

    const defaultChannel = await this.prisma.channel.findFirst({
      where: { spaceId, isDefault: true },
    });
    if (defaultChannel) {
      const content = `${targetProfile?.fullName || 'Someone'} is now the Owner of this space (transferred by ${actorProfile?.fullName || 'an admin'})`;
      await this.systemMessages.sendSystemMessage(
        defaultChannel.id,
        userId,
        content,
      );
    }

    const rolePatches = [
      { userId: targetUserId, role: SpaceRole.ADMIN },
      { userId, role: SpaceRole.MEMBER },
    ];

    this.chatSocketPublisher.publishMemberRoleUpdated(
      [
        ...new Set([
          ...channels.map((channel) => channel.id),
          ...members.map((member) => member.userId),
        ]),
      ],
      {
        eventType: SPACE_SOCKET_EVENT_TYPE.MEMBER_ROLE_UPDATED,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        spaceId,
        spaceName: space?.name ?? null,
        createdBy: targetUserId,
        ownerId: targetUserId,
        previousOwnerId: userId,
        affectedUserIds: [targetUserId, userId],
        actorProfile: actorProfile ?? null,
        targetProfile: targetProfile ?? null,
        members: rolePatches,
        member: {
          userId: targetUserId,
          role: SpaceRole.ADMIN,
        },
      },
    );

    this.events.publishSpaceActionNotifications({
      recipientIds: members.map((member) => member.userId),
      actorId: userId,
      actorName: actorProfile?.fullName || 'an admin',
      actorAvatar: actorProfile?.avatarUrl,
      type: KAFKA_EVENTS.NOTIFICATION.SPACE_OWNERSHIP_TRANSFERRED,
      title: 'Space ownership transferred',
      content: `${targetProfile?.fullName || 'Someone'} is now the Owner of ${space.name} (transferred by ${actorProfile?.fullName || 'an admin'})`,
      metadata: {
        spaceId,
        spaceName: space.name,
        actorId: userId,
        actorName: actorProfile?.fullName || 'an admin',
        targetUserId,
        targetName: targetProfile?.fullName || 'Someone',
      },
    });

    return updatedSpace;
  }

  async updateSpaceMemberRole(
    spaceId: string,
    userId: string,
    targetUserId: string,
    newRole: SpaceRole,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException('You cannot change your own role');
    }

    await this.access.assertSpaceOwner(spaceId, userId);

    const targetMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
    });
    if (!targetMember) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }

    const updatedMember = await this.prisma.spaceMember.update({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
      data: { role: newRole },
    });

    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });
    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });

    const profileByUserId = await this.presentation.getProfileMap([
      userId,
      targetUserId,
    ]);
    const actorProfile = profileByUserId.get(userId);
    const targetProfile = profileByUserId.get(targetUserId);

    const defaultChannel = await this.prisma.channel.findFirst({
      where: { spaceId, isDefault: true },
    });
    if (defaultChannel) {
      const roleName = newRole === SpaceRole.ADMIN ? 'Admin' : 'Member';
      const content = `${targetProfile?.fullName || 'Someone'} is now the ${roleName} of this space (set by ${actorProfile?.fullName || 'an admin'})`;
      await this.systemMessages.sendSystemMessage(
        defaultChannel.id,
        userId,
        content,
      );
    }

    this.chatSocketPublisher.publishMemberRoleUpdated(
      [
        ...channels.map((channel) => channel.id),
        ...members.map((member) => member.userId),
      ],
      {
        eventType: SPACE_SOCKET_EVENT_TYPE.MEMBER_ROLE_UPDATED,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        spaceId,
        spaceName: null,
        affectedUserIds: [targetUserId, userId],
        actorProfile: actorProfile ?? null,
        targetProfile: targetProfile ?? null,
        members: [{ userId: targetUserId, role: newRole }],
        member: {
          userId: targetUserId,
          role: newRole,
        },
      },
    );

    return updatedMember;
  }

  async removeSpaceMember(
    userId: string,
    spaceId: string,
    targetUserId: string,
  ) {
    await this.access.assertNotProjectSpace(spaceId);
    const { space, isOwner } = await this.access.assertSpaceAdminOrOwner(
      spaceId,
      userId,
    );
    if (userId === targetUserId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SELF_REMOVE);
    }
    const target = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
    });
    if (!target) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
    if (targetUserId === space.createdBy) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.OWNER_REMOVE);
    }
    if (!isOwner && target.role !== SpaceRole.MEMBER) {
      throw new BadRequestException(
        SPACE_ERROR_MESSAGES.ADMIN_REMOVE_MEMBER_ONLY,
      );
    }
    if (target.role === SpaceRole.ADMIN) {
      const adminCount = await this.access.getAdminCount(spaceId);
      if (adminCount <= 1) {
        throw new BadRequestException(SPACE_ERROR_MESSAGES.LAST_ADMIN);
      }
    }

    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true, name: true },
    });
    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });
    const defaultChannel = await this.access.getDefaultChannel(spaceId);
    const profileByUserId = await this.presentation.getProfileMap([
      userId,
      targetUserId,
    ]);
    const actorProfile = profileByUserId.get(userId) ?? null;
    const targetProfile = profileByUserId.get(targetUserId) ?? null;
    const actorName = this.presentation.getProfileDisplayName(
      actorProfile,
      userId,
    );
    const targetName = this.presentation.getProfileDisplayName(
      targetProfile,
      targetUserId,
    );
    if (defaultChannel) {
      await this.systemMessages.sendSystemMessage(
        defaultChannel.id,
        userId,
        `${targetName} was removed from the space`,
      );
    }

    const privateMembershipChanges = await this.prisma.$transaction(
      async (tx) => {
        const privateChanges = await reconcilePrivateMemberships(
          tx,
          spaceId,
          [targetUserId],
          {
            actorId: userId,
            action: PrivateChannelMembershipAction.SPACE_REMOVED,
          },
        );
        await tx.spaceMember.delete({
          where: { spaceId_userId: { spaceId, userId: targetUserId } },
        });
        await tx.channelMember.deleteMany({
          where: {
            userId: targetUserId,
            channelId: { in: channels.map((channel) => channel.id) },
          },
        });
        return privateChanges;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    publishPrivateMembershipChanges(
      this.chatSocketPublisher,
      privateMembershipChanges,
      this.kafkaClient,
    );

    this.chatSocketPublisher.publishMemberKicked(
      [
        ...new Set([
          targetUserId,
          ...members
            .map((member) => member.userId)
            .filter((memberId) => memberId !== targetUserId),
          ...channels.map((channel) => channel.id),
        ]),
      ],
      {
        eventType: SPACE_SOCKET_EVENT_TYPE.MEMBER_REMOVED,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        spaceId,
        spaceName: space?.name ?? null,
        channelId: defaultChannel?.id ?? channels[0]?.id ?? null,
        userId: targetUserId,
        affectedUserIds: [targetUserId],
        leftSpace: true,
        actorProfile,
        targetProfile,
      },
    );

    this.events.publishSpaceActionNotification({
      recipientId: targetUserId,
      actorId: userId,
      actorName,
      actorAvatar: actorProfile?.avatarUrl,
      type: KAFKA_EVENTS.NOTIFICATION.SPACE_MEMBER_REMOVED,
      title: 'Removed from space',
      content: `You were removed from ${space?.name ?? 'a space'} by ${actorName ?? 'an admin'}`,
      metadata: {
        spaceId,
        spaceName: space?.name,
        actorId: userId,
        actorName,
        targetUserId,
        targetName,
      },
    });

    return { success: true };
  }

  async leaveSpace(userId: string, spaceId: string) {
    await this.access.assertNotProjectSpace(spaceId);
    const member = await this.access.assertSpaceMember(spaceId, userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { createdBy: true },
    });
    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }
    if (space.createdBy === userId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.OWNER_CANNOT_LEAVE);
    }

    if (member.role === SpaceRole.ADMIN) {
      const adminCount = await this.access.getAdminCount(spaceId);
      if (adminCount <= 1) {
        throw new BadRequestException(SPACE_ERROR_MESSAGES.LAST_ADMIN);
      }
    }

    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });
    const defaultChannel = await this.access.getDefaultChannel(spaceId);
    if (defaultChannel) {
      const displayName = await this.presentation.getUserDisplayName(userId);
      await this.systemMessages.sendSystemMessage(
        defaultChannel.id,
        userId,
        `${displayName} left the space`,
      );
    }

    const privateMembershipChanges = await this.prisma.$transaction(
      async (tx) => {
        const privateChanges = await reconcilePrivateMemberships(
          tx,
          spaceId,
          [userId],
          {
            actorId: userId,
            action: PrivateChannelMembershipAction.SPACE_LEFT,
          },
        );
        await tx.spaceMember.delete({
          where: { spaceId_userId: { spaceId, userId } },
        });
        await tx.channelMember.deleteMany({
          where: {
            userId,
            channelId: { in: channels.map((channel) => channel.id) },
          },
        });
        return privateChanges;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    publishPrivateMembershipChanges(
      this.chatSocketPublisher,
      privateMembershipChanges,
      this.kafkaClient,
    );

    this.events.emitSpaceMemberRemoved(
      spaceId,
      channels.map((channel) => channel.id),
      userId,
      true,
    );
    return { success: true };
  }
}
