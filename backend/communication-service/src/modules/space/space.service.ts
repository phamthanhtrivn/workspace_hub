import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { InvitationStatus, SpaceRole } from '@prisma/client';
import {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
} from '../../common/constants/kafka.constants';
import { DefaultSpaceChannelNames } from './types/space.types';
import { InviteSpaceMemberDto } from './dto/invite-space-members.dto';
import { UpdateSpaceSettingDto } from './dto/update-space-setting.dto';
import { UserProfileSnapshot } from 'src/common/types/user.types';
import { ChatGateway } from '../chat/chat.gateway';
import { ChatEvent } from '../chat/chat.events';
import { CHAT_CONTEXT_TYPE } from '../chat/types/chat.enums';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import {
  SPACE_ERROR_MESSAGES,
  SPACE_MEMBER_SEARCH_DEFAULT_LIMIT,
  SPACE_MEMBER_SEARCH_MAX_LIMIT,
} from './types/space.enums';

@Injectable()
export class SpaceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
    private readonly chatGateway: ChatGateway,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
  ) {}

  private normalizeLimit(limit?: string | number) {
    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return SPACE_MEMBER_SEARCH_DEFAULT_LIMIT;
    }
    return Math.min(Math.floor(parsedLimit), SPACE_MEMBER_SEARCH_MAX_LIMIT);
  }

  private normalizeSearch(search?: string) {
    return search?.trim().toLowerCase() ?? '';
  }

  private async assertSpaceMember(spaceId: string, userId: string) {
    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!member) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.NOT_MEMBER);
    }
    return member;
  }

  private async assertSpaceAdmin(spaceId: string, userId: string) {
    const member = await this.assertSpaceMember(spaceId, userId);
    if (member.role !== SpaceRole.ADMIN) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.ADMIN_REQUIRED);
    }
    return member;
  }

  private async getAdminCount(spaceId: string) {
    return this.prisma.spaceMember.count({
      where: { spaceId, role: SpaceRole.ADMIN },
    });
  }

  private getDefaultSpaceSetting(spaceId: string) {
    return {
      id: null,
      spaceId,
      allowMemberCreateChannel: true,
      allowMemberDeleteOwnChannel: false,
    };
  }

  private isMissingSpaceSettingTableError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      (('code' in error && error.code === 'P2021') ||
        ('message' in error &&
          typeof error.message === 'string' &&
          error.message.includes('space_settings')))
    );
  }

  private async getSpaceSetting(spaceId: string) {
    try {
      const setting = await (this.prisma as any).spaceSetting.findUnique({
        where: { spaceId },
      });
      return setting ?? this.getDefaultSpaceSetting(spaceId);
    } catch (error) {
      if (this.isMissingSpaceSettingTableError(error)) {
        return this.getDefaultSpaceSetting(spaceId);
      }
      throw error;
    }
  }

  private async createSpaceSettingIfAvailable(tx: any, spaceId: string) {
    try {
      await tx.spaceSetting.create({
        data: {
          spaceId,
          allowMemberCreateChannel: true,
          allowMemberDeleteOwnChannel: false,
        },
      });
    } catch (error) {
      if (!this.isMissingSpaceSettingTableError(error)) {
        throw error;
      }
    }
  }

  private async getUserDisplayName(userId: string) {
    const profiles = await this.userProfileSnapshotService.getProfilesByUserIds([
      userId,
    ]);
    return profiles.get(userId)?.fullName || profiles.get(userId)?.email || userId;
  }

  private async getDefaultChannel(spaceId: string) {
    return this.prisma.channel.findFirst({
      where: { spaceId, isDefault: true },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async getProfileMap(userIds: string[]) {
    return this.userProfileSnapshotService.getProfilesByUserIds(userIds);
  }

  private getProfileDisplayName(
    profile:
      | {
          fullName?: string | null;
          email?: string | null;
        }
      | null
      | undefined,
    fallback: string,
  ) {
    return profile?.fullName || profile?.email || fallback;
  }

  private matchesMemberSearch(member: any, search: string) {
    if (!search) return true;
    return [
      member.userId,
      member.profile?.fullName,
      member.profile?.email,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  }

  private async emitSpaceMemberRemoved(
    spaceId: string,
    channelIds: string[],
    userId: string,
    leftSpace: boolean,
  ) {
    this.chatGateway.server
      .to([userId, ...channelIds])
      .emit(ChatEvent.MEMBER_LEFT, {
        eventType: leftSpace ? 'space_left' : 'member_left',
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        spaceId,
        channelId: channelIds[0] ?? null,
        userId,
        affectedUserIds: [userId],
        leftSpace,
      });
  }

  private emitSpaceInvitation(invitation: {
    invitedUserId: string;
    invitedBy: string;
    invitedByName?: string | null;
    invitedByAvatar?: string | null;
    id: string;
    spaceId: string;
  }, spaceName?: string | null) {
    this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
      key: invitation.invitedUserId,
      value: {
        recipientId: invitation.invitedUserId,
        senderId: invitation.invitedBy,
        senderName: invitation.invitedByName,
        senderAvatar: invitation.invitedByAvatar,
        type: KAFKA_EVENTS.NOTIFICATION.SPACE_INVITATION,
        title: 'Space invitation',
        content: `You were invited to ${spaceName}`,
        link: '/chat',
        metadata: {
          invitationId: invitation.id,
          spaceId: invitation.spaceId,
          spaceName,
        },
      },
    });
  }

  private publishSpaceActionNotification(params: {
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

  private publishSpaceActionNotifications(params: {
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

  private async mapChannelForClient(channel: any, userId?: string) {
    const roles = await this.prisma.spaceMember.findMany({
      where: {
        spaceId: channel.spaceId,
        userId: { in: channel.members.map((member) => member.userId) },
      },
      select: {
        userId: true,
        role: true,
      },
    });
    const roleByUserId = new Map(
      roles.map((member) => [member.userId, member.role]),
    );

    let unreadCount = 0;
    if (userId) {
      const currentMember = channel.members.find(
        (member) => member.userId === userId,
      );
      if (currentMember) {
        const referenceDate = currentMember.lastReadAt || currentMember.joinedAt;
        unreadCount = await this.prisma.message.count({
          where: {
            channelId: channel.id,
            senderId: { not: userId },
            createdAt: { gt: referenceDate },
          },
        });
      }
    }

    return {
      ...channel,
      unreadCount,
      members: channel.members.map((member) => ({
        ...member,
        role: roleByUserId.get(member.userId) ?? SpaceRole.MEMBER,
      })),
    };
  }

  async createSpace(userId: string, name: string) {
    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Space name cannot be empty');
    }

    return this.prisma.$transaction(async (tx) => {
      const space = await tx.space.create({
        data: {
          name,
          createdBy: userId,
        },
      });

      await tx.spaceMember.create({
        data: {
          spaceId: space.id,
          userId,
          role: SpaceRole.ADMIN,
        },
      });

      await this.createSpaceSettingIfAvailable(tx, space.id);

      for (const channelName of DefaultSpaceChannelNames) {
        const channel = await tx.channel.create({
          data: {
            spaceId: space.id,
            name: channelName,
            createdBy: userId,
            isDefault: true,
          },
        });

        await tx.channelSetting.create({
          data: {
            channelId: channel.id,
            allowSendMessage: true,
            allowCreateNote: true,
            allowCreatePoll: true,
            allowPinMessage: true,
          },
        });

        await tx.channelMember.create({
          data: {
            channelId: channel.id,
            userId,
          },
        });
      }

      return space;
    });
  }

  async getUserSpaces(userId: string) {
    return this.prisma.space.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        setting: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getSpaceDetails(userId: string, spaceId: string) {
    await this.assertSpaceMember(spaceId, userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        _count: {
          select: {
            members: true,
            channels: true,
          },
        },
      },
    });

    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }

    const { _count, ...spaceDetails } = space;
    return {
      ...spaceDetails,
      setting: await this.getSpaceSetting(spaceId),
      memberCount: _count.members,
      channelCount: _count.channels,
    };
  }

  async updateSpace(userId: string, spaceId: string, name: string) {
    await this.assertSpaceAdmin(spaceId, userId);
    if (!name || name.trim().length === 0) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NAME_EMPTY);
    }

    return this.prisma.space.update({
      where: { id: spaceId },
      data: { name: name.trim() },
    });
  }

  async updateSpaceSettings(
    userId: string,
    spaceId: string,
    settings: UpdateSpaceSettingDto,
  ) {
    await this.assertSpaceAdmin(spaceId, userId);
    try {
      const updatedSetting = await (this.prisma as any).spaceSetting.upsert({
        where: { spaceId },
        create: {
          spaceId,
          allowMemberCreateChannel:
            settings.allowMemberCreateChannel ?? true,
          allowMemberDeleteOwnChannel: false,
        },
        update: {
          allowMemberCreateChannel: settings.allowMemberCreateChannel,
          allowMemberDeleteOwnChannel: false,
        },
      });
      const channels = await this.prisma.channel.findMany({
        where: { spaceId },
        select: { id: true },
      });
      const members = await this.prisma.spaceMember.findMany({
        where: { spaceId },
        select: { userId: true },
      });
      const space = await this.prisma.space.findUnique({
        where: { id: spaceId },
        select: { name: true },
      });
      this.chatGateway.server
        .to([
          ...channels.map((channel) => channel.id),
          ...members.map((member) => member.userId),
        ])
        .emit(ChatEvent.CHANNEL_SETTING_UPDATED, {
          eventType: 'space_setting_updated',
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          spaceId,
          spaceName: space?.name ?? null,
          affectedUserIds: members.map((member) => member.userId),
          setting: updatedSetting,
        });
      return updatedSetting;
    } catch (error) {
      if (this.isMissingSpaceSettingTableError(error)) {
        throw new BadRequestException(SPACE_ERROR_MESSAGES.SETTINGS_UNAVAILABLE);
      }
      throw error;
    }
  }

  async getSpaceMembers(
    userId: string,
    spaceId: string,
    search?: string,
    limit?: string | number,
  ) {
    await this.assertSpaceMember(spaceId, userId);

    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      orderBy: { joinedAt: 'asc' },
    });
    const enrichedMembers =
      await this.userProfileSnapshotService.attachProfilesToMembers(members);
    const normalizedSearch = this.normalizeSearch(search);
    const normalizedLimit = this.normalizeLimit(limit);
    const filteredMembers = enrichedMembers
      .filter((member) => this.matchesMemberSearch(member, normalizedSearch))
      .sort((firstMember, secondMember) => {
        const firstName =
          firstMember.profile?.fullName ||
          firstMember.profile?.email ||
          firstMember.userId;
        const secondName =
          secondMember.profile?.fullName ||
          secondMember.profile?.email ||
          secondMember.userId;
        return firstName.localeCompare(secondName);
      });
    const limitedMembers = filteredMembers.slice(0, normalizedLimit);

    return {
      total: members.length,
      admins: limitedMembers.filter((member) => member.role === SpaceRole.ADMIN),
      members: limitedMembers.filter(
        (member) => member.role !== SpaceRole.ADMIN,
      ),
      nextCursor:
        filteredMembers.length > normalizedLimit
          ? limitedMembers[limitedMembers.length - 1]?.userId ?? null
          : null,
    };
  }

  async updateSpaceMemberRole(
    userId: string,
    spaceId: string,
    targetUserId: string,
    role: SpaceRole,
  ) {
    await this.assertSpaceAdmin(spaceId, userId);
    if (userId === targetUserId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SELF_ROLE_CHANGE);
    }

    const target = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
    });
    if (!target) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
    if (target.role === SpaceRole.ADMIN && role !== SpaceRole.ADMIN) {
      const adminCount = await this.getAdminCount(spaceId);
      if (adminCount <= 1) {
        throw new BadRequestException(SPACE_ERROR_MESSAGES.LAST_ADMIN);
      }
    }

    const updatedMember = await this.prisma.spaceMember.update({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
      data: { role },
    });
    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });
    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { id: true, name: true },
    });
    const profileByUserId = await this.getProfileMap([userId, targetUserId]);
    this.chatGateway.server
      .to([
        ...channels.map((channel) => channel.id),
        ...members.map((member) => member.userId),
      ])
      .emit(ChatEvent.MEMBER_ROLE_UPDATED, {
        eventType: 'space_member_role_updated',
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        spaceId,
        spaceName: space?.name ?? null,
        affectedUserIds: [updatedMember.userId],
        actorProfile: profileByUserId.get(userId) ?? null,
        targetProfile: profileByUserId.get(targetUserId) ?? null,
        member: {
          userId: updatedMember.userId,
          role: updatedMember.role,
        },
      });
    return updatedMember;
  }

  async removeSpaceMember(
    userId: string,
    spaceId: string,
    targetUserId: string,
  ) {
    await this.assertSpaceAdmin(spaceId, userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    });
    if (userId === targetUserId) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SELF_REMOVE);
    }
    const target = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId: targetUserId } },
    });
    if (!target) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.MEMBER_NOT_FOUND);
    }
    if (target.role === SpaceRole.ADMIN) {
      const adminCount = await this.getAdminCount(spaceId);
      if (adminCount <= 1) {
        throw new BadRequestException(SPACE_ERROR_MESSAGES.LAST_ADMIN);
      }
    }

    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true, name: true },
    });
    const defaultChannel = await this.getDefaultChannel(spaceId);
    const profileByUserId = await this.getProfileMap([userId, targetUserId]);
    const actorProfile = profileByUserId.get(userId) ?? null;
    const targetProfile = profileByUserId.get(targetUserId) ?? null;
    const actorName = this.getProfileDisplayName(actorProfile, userId);
    const targetName = this.getProfileDisplayName(targetProfile, targetUserId);
    if (defaultChannel) {
      await this.chatGateway.sendSystemMessage(
        defaultChannel.id,
        userId,
        `${targetName} was removed from the space`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.spaceMember.delete({
        where: { spaceId_userId: { spaceId, userId: targetUserId } },
      });
      await tx.channelMember.deleteMany({
        where: {
          userId: targetUserId,
          channelId: { in: channels.map((channel) => channel.id) },
        },
      });
    });

    this.chatGateway.server
      .to([targetUserId, ...channels.map((channel) => channel.id)])
      .emit(ChatEvent.MEMBER_KICKED, {
        eventType: 'space_member_removed',
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        spaceId,
        spaceName: space?.name ?? null,
        channelId: defaultChannel?.id ?? channels[0]?.id ?? null,
        channelIds: channels.map((channel) => channel.id),
        userId: targetUserId,
        affectedUserIds: [targetUserId],
        leftSpace: true,
        actorProfile,
        targetProfile,
      });

    this.publishSpaceActionNotification({
      recipientId: targetUserId,
      actorId: userId,
      actorName,
      actorAvatar: actorProfile?.avatarUrl,
      type: KAFKA_EVENTS.NOTIFICATION.SPACE_MEMBER_REMOVED,
      title: 'Removed from space',
      content: `You were removed from ${space?.name ?? 'a space'}`,
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
    const member = await this.assertSpaceMember(spaceId, userId);
    if (member.role === SpaceRole.ADMIN) {
      const adminCount = await this.getAdminCount(spaceId);
      if (adminCount <= 1) {
        throw new BadRequestException(SPACE_ERROR_MESSAGES.LAST_ADMIN);
      }
    }

    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });
    const defaultChannel = await this.getDefaultChannel(spaceId);
    if (defaultChannel) {
      const displayName = await this.getUserDisplayName(userId);
      await this.chatGateway.sendSystemMessage(
        defaultChannel.id,
        userId,
        `${displayName} left the space`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.spaceMember.delete({
        where: { spaceId_userId: { spaceId, userId } },
      });
      await tx.channelMember.deleteMany({
        where: {
          userId,
          channelId: { in: channels.map((channel) => channel.id) },
        },
      });
    });

    await this.emitSpaceMemberRemoved(
      spaceId,
      channels.map((channel) => channel.id),
      userId,
      true,
    );
    return { success: true };
  }

  async deleteSpace(userId: string, spaceId: string) {
    await this.assertSpaceAdmin(spaceId, userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    });
    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true, name: true },
    });
    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      select: { userId: true },
    });
    const profileByUserId = await this.getProfileMap([userId]);
    const actorProfile = profileByUserId.get(userId) ?? null;
    const actorName = this.getProfileDisplayName(actorProfile, userId);

    await this.prisma.space.delete({ where: { id: spaceId } });

    this.chatGateway.server
      .to([...channels.map((channel) => channel.id), ...members.map((member) => member.userId)])
      .emit(ChatEvent.CONVERSATION_DISBANDED, {
        eventType: 'space_disbanded',
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        spaceId,
        spaceName: space?.name ?? null,
        channelIds: channels.map((channel) => channel.id),
        affectedUserIds: members.map((member) => member.userId),
        leftSpace: true,
        actorProfile,
      });

    this.publishSpaceActionNotifications({
      recipientIds: members.map((member) => member.userId),
      actorId: userId,
      actorName,
      actorAvatar: actorProfile?.avatarUrl,
      type: KAFKA_EVENTS.NOTIFICATION.SPACE_DISBANDED,
      title: 'Space disbanded',
      content: `${space?.name ?? 'A space'} was disbanded`,
      metadata: {
        spaceId,
        spaceName: space?.name,
        actorId: userId,
        actorName,
      },
    });

    return { success: true };
  }

  async getSpaceInvitations(userId: string, spaceId: string) {
    await this.assertSpaceAdmin(spaceId, userId);
    return this.prisma.spaceInvitation.findMany({
      where: { spaceId, status: InvitationStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelSpaceInvitation(
    userId: string,
    spaceId: string,
    invitationId: string,
  ) {
    await this.assertSpaceAdmin(spaceId, userId);
    const invitation = await this.prisma.spaceInvitation.findFirst({
      where: { id: invitationId, spaceId },
    });
    if (!invitation) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.INVITATION_NOT_FOUND);
    }

    await this.prisma.spaceInvitation.delete({ where: { id: invitationId } });
    return { success: true };
  }

  async resendSpaceInvitation(
    userId: string,
    spaceId: string,
    invitationId: string,
  ) {
    await this.assertSpaceAdmin(spaceId, userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    });
    const existingInvitation = await this.prisma.spaceInvitation.findFirst({
      where: { id: invitationId, spaceId },
    });
    if (!existingInvitation) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.INVITATION_NOT_FOUND);
    }
    const invitation = await this.prisma.spaceInvitation.update({
      where: { id: invitationId },
      data: {
        invitedBy: userId,
        status: InvitationStatus.PENDING,
        respondedAt: null,
        createdAt: new Date(),
      },
    });

    this.emitSpaceInvitation(invitation, space?.name);
    return invitation;
  }

  async createChannel(userId: string, spaceId: string, name: string) {
    const isMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!isMember) {
      throw new BadRequestException('You are not a member of this space');
    }

    if (isMember.role === SpaceRole.MEMBER) {
      const setting = await this.getSpaceSetting(spaceId);
      if (!setting.allowMemberCreateChannel) {
        throw new BadRequestException(
          SPACE_ERROR_MESSAGES.CHANNEL_CREATE_DISABLED,
        );
      }
    }

    if (!name || name.trim().length === 0) {
      throw new BadRequestException('Channel name cannot be empty');
    }

    const trimmedName = name.trim();

    // Check if channel already exists in this space (case-insensitive)
    const existingChannel = await this.prisma.channel.findFirst({
      where: {
        spaceId,
        name: {
          equals: trimmedName,
          mode: 'insensitive',
        },
      },
    });

    if (existingChannel) {
      throw new BadRequestException(
        SPACE_ERROR_MESSAGES.CHANNEL_NAME_EXISTS,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const channel = await tx.channel.create({
        data: {
          spaceId,
          name: trimmedName,
          createdBy: userId,
          isDefault: false,
        },
      });

      await tx.channelSetting.create({
        data: {
          channelId: channel.id,
          allowSendMessage: true,
          allowCreateNote: true,
          allowCreatePoll: true,
          allowPinMessage: true,
        },
      });

      await tx.channelMember.create({
        data: {
          channelId: channel.id,
          userId,
        },
      });

      const createdChannel = await tx.channel.findUnique({
        where: { id: channel.id },
        include: {
          setting: true,
          members: true,
        },
      });
      if (!createdChannel) {
        throw new BadRequestException('Channel creation failed');
      }

      const spaceMembers = await tx.spaceMember.findMany({
        where: {
          spaceId,
          userId: { in: createdChannel.members.map((m) => m.userId) },
        },
      });

      return {
        ...createdChannel,
        members: createdChannel.members.map((member) => ({
          ...member,
          role:
            spaceMembers.find(
              (spaceMember) => spaceMember.userId === member.userId,
            )?.role ?? SpaceRole.MEMBER,
        })),
      };
    });
  }

  async getSpaceChannels(userId: string, spaceId: string, search?: string) {
    const isMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!isMember) {
      throw new BadRequestException('You are not a member of this space');
    }

    const whereClause: any = { spaceId };
    if (search && search.trim().length > 0) {
      whereClause.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const channels = await this.prisma.channel.findMany({
      where: whereClause,
      include: {
        setting: true,
        members: true,
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
        createdAt: 'asc',
      },
    });

    return Promise.all(
      channels.map((channel) => this.mapChannelForClient(channel, userId)),
    );
  }

  async inviteMembersToSpace(
    userId: string,
    spaceId: string,
    invitees: InviteSpaceMemberDto[],
    invitedBySnapshot: UserProfileSnapshot,
  ) {
    const requester = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId,
          userId,
        },
      },
    });

    if (!requester || requester.role === SpaceRole.MEMBER) {
      throw new BadRequestException(
        'You are not allowed to invite members to this space',
      );
    }

    if (!invitees || invitees.length === 0) {
      return { count: 0 };
    }

    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      select: { name: true },
    });

    return this.prisma
      .$transaction(async (tx) => {
        const invitationsToNotify: {
          userId: string;
          invitationId: string;
          invitedByName?: string | null;
          invitedByAvatar?: string | null;
        }[] = [];
        const alreadyMembers: string[] = [];
        const alreadyPending: string[] = [];
        for (const invitee of invitees) {
          const invitedId = invitee.userId;
          if (!invitedId || invitedId === userId) {
            continue;
          }

          const exists = await tx.spaceMember.findUnique({
            where: {
              spaceId_userId: {
                spaceId,
                userId: invitedId,
              },
            },
          });

          if (exists) {
            alreadyMembers.push(invitedId);
            continue;
          }

          const existingInvitation = await tx.spaceInvitation.findUnique({
            where: {
              spaceId_invitedUserId: {
                spaceId,
                invitedUserId: invitedId,
              },
            },
          });

          if (existingInvitation?.status === InvitationStatus.PENDING) {
            alreadyPending.push(invitedId);
            continue;
          }

          if (existingInvitation) {
            const invitation = await tx.spaceInvitation.update({
              where: { id: existingInvitation.id },
              data: {
                invitedBy: userId,
                invitedByName: invitedBySnapshot.fullName,
                invitedByAvatar: invitedBySnapshot.avatarUrl,
                invitedUserName: invitee.fullName,
                invitedUserAvatar: invitee.avatarUrl,
                status: InvitationStatus.PENDING,
                respondedAt: null,
              },
            });
            invitationsToNotify.push({
              userId: invitedId,
              invitationId: invitation.id,
              invitedByName: invitation.invitedByName,
              invitedByAvatar: invitation.invitedByAvatar,
            });
          } else {
            const invitation = await tx.spaceInvitation.create({
              data: {
                spaceId,
                invitedUserId: invitedId,
                invitedBy: userId,
                invitedByName: invitedBySnapshot.fullName,
                invitedByAvatar: invitedBySnapshot.avatarUrl,
                invitedUserName: invitee.fullName,
                invitedUserAvatar: invitee.avatarUrl,
              },
            });
            invitationsToNotify.push({
              userId: invitedId,
              invitationId: invitation.id,
              invitedByName: invitation.invitedByName,
              invitedByAvatar: invitation.invitedByAvatar,
            });
          }
        }

        return {
          count: invitationsToNotify.length,
          invitationsToNotify,
          alreadyMemberCount: alreadyMembers.length,
          pendingCount: alreadyPending.length,
        };
      })
      .then((result) => {
        for (const invitation of result.invitationsToNotify) {
          this.emitSpaceInvitation(
            {
              id: invitation.invitationId,
              spaceId,
              invitedUserId: invitation.userId,
              invitedBy: userId,
              invitedByName: invitation.invitedByName,
              invitedByAvatar: invitation.invitedByAvatar,
            },
            space?.name,
          );
        }

        return result;
      });
  }
}
