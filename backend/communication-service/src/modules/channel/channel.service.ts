import {
  Injectable,
  BadRequestException,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { SpaceRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/infrastructure/s3/s3.service';
import { UpdateChannelSettingDto } from './dto/update-channel-setting.dto';
import { ChatEvent } from '../chat/chat.events';
import { CHAT_CONTEXT_TYPE } from '../chat/types/chat.enums';
import { getMediaUrl } from 'src/common/utils/file.util';
import { S3_UPLOAD_TYPE } from 'src/common/types/file.enums';
import {
  CHANNEL_ERROR_MESSAGES,
  CHANNEL_MEMBER_SEARCH_DEFAULT_LIMIT,
  CHANNEL_MEMBER_SEARCH_MAX_LIMIT,
} from './types/channel.enums';
import {
  ChannelMemberListItem,
  ChannelMembersListResponse,
} from './types/channel-members.types';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
} from '../../common/constants/kafka.constants';

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly s3Service: S3Service,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  async getUserChannels(userId: string) {
    const channels = await this.prisma.channel.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
        setting: true,
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

    const channelsWithUnread = await Promise.all(
      channels.map(async (channel) => {
        const member = channel.members.find((item) => item.userId === userId);
        let unreadCount = 0;

        if (member) {
          const referenceDate = member.lastReadAt || member.joinedAt;
          unreadCount = await this.prisma.message.count({
            where: {
              channelId: channel.id,
              createdAt: {
                gt: referenceDate,
              },
              senderId: {
                not: userId,
              },
            },
          });
        }

        return this.enrichChannelForClient({
          ...channel,
          unreadCount,
        });
      }),
    );

    return channelsWithUnread;
  }

  private async getSpaceChannelIds(spaceId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });

    return channels.map((channel) => channel.id);
  }

  private async mapChannelForClient(channel: any) {
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

    const membersWithRoles = channel.members.map((member) => ({
      ...member,
      role: roleByUserId.get(member.userId) ?? SpaceRole.MEMBER,
    }));

    return this.enrichChannelForClient({
      ...channel,
      members: membersWithRoles,
    });
  }

  private async enrichChannelForClient(channel: any) {
    const members =
      await this.userProfileSnapshotService.attachProfilesToMembers(
        channel.members ?? [],
      );
    const messages =
      await this.userProfileSnapshotService.attachSenderProfilesToMessages(
        channel.messages ?? [],
      );

    return {
      ...channel,
      members,
      messages,
    };
  }

  private normalizeLimit(limit?: string | number) {
    const parsedLimit = Number(limit);

    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return CHANNEL_MEMBER_SEARCH_DEFAULT_LIMIT;
    }

    return Math.min(Math.floor(parsedLimit), CHANNEL_MEMBER_SEARCH_MAX_LIMIT);
  }

  private normalizeSearch(search?: string) {
    return search?.trim().toLowerCase() ?? '';
  }

  private matchesChannelMemberSearch(
    member: ChannelMemberListItem,
    search: string,
  ) {
    if (!search) return true;

    const searchableValues = [
      member.userId,
      member.nickname,
      member.profile?.fullName,
      member.profile?.email,
    ].filter(Boolean);

    return searchableValues.some((value) =>
      String(value).toLowerCase().includes(search),
    );
  }

  private sortChannelMembers(
    firstMember: ChannelMemberListItem,
    secondMember: ChannelMemberListItem,
  ) {
    const firstName =
      firstMember.nickname ||
      firstMember.profile?.fullName ||
      firstMember.profile?.email ||
      firstMember.userId;
    const secondName =
      secondMember.nickname ||
      secondMember.profile?.fullName ||
      secondMember.profile?.email ||
      secondMember.userId;

    return firstName.localeCompare(secondName);
  }

  private async emitRoleUpdateToSpaceChannels(
    spaceId: string,
    member: { userId: string; role: SpaceRole },
  ) {
    const channelIds = await this.getSpaceChannelIds(spaceId);

    channelIds.forEach((channelId) => {
      this.chatGateway.server
        .to(channelId)
        .emit(ChatEvent.MEMBER_ROLE_UPDATED, {
          chatId: channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId,
          member,
        });
    });
  }

  private async getUserDisplayName(userId: string) {
    const profiles = await this.userProfileSnapshotService.getProfilesByUserIds(
      [userId],
    );
    const profile = profiles.get(userId);
    return profile?.fullName || profile?.email || userId;
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

  private publishChannelDisbandedNotifications(params: {
    recipientIds: string[];
    actorId: string;
    actorName?: string | null;
    actorAvatar?: string | null;
    spaceId: string;
    spaceName?: string | null;
    channelId: string;
    channelName: string;
  }) {
    for (const recipientId of new Set(params.recipientIds)) {
      if (!recipientId || recipientId === params.actorId) continue;
      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: recipientId,
        value: {
          recipientId,
          senderId: params.actorId,
          senderName: params.actorName,
          senderAvatar: params.actorAvatar,
          type: KAFKA_EVENTS.NOTIFICATION.CHANNEL_DISBANDED,
          title: 'Channel deleted',
          content: `#${params.channelName} was deleted in ${params.spaceName ?? 'a space'} by ${params.actorName ?? 'an admin'}`,
          link: '/chat',
          metadata: {
            spaceId: params.spaceId,
            spaceName: params.spaceName,
            channelId: params.channelId,
            channelName: params.channelName,
            actorId: params.actorId,
            actorName: params.actorName,
          },
        },
      });
    }
  }

  async getChannelMembers(
    channelId: string,
    userId: string,
    search?: string,
    limit?: string | number,
  ): Promise<ChannelMembersListResponse> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: true },
    });

    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    const requester = channel.members.find(
      (member) => member.userId === userId,
    );
    if (!requester) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
    }

    const roleRows = await this.prisma.spaceMember.findMany({
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
      roleRows.map((member) => [member.userId, member.role]),
    );
    const normalizedSearch = this.normalizeSearch(search);
    const normalizedLimit = this.normalizeLimit(limit);

    const memberItems = channel.members.map((member) => ({
      id: member.id,
      userId: member.userId,
      joinedAt: member.joinedAt,
      muted: member.muted,
      pinned: member.pinned,
      nickname: member.nickname,
      role: roleByUserId.get(member.userId) ?? SpaceRole.MEMBER,
    }));
    const enrichedMembers =
      await this.userProfileSnapshotService.attachProfilesToMembers(
        memberItems,
      );

    const filteredMembers = enrichedMembers
      .filter((member) =>
        this.matchesChannelMemberSearch(member, normalizedSearch),
      )
      .sort((firstMember, secondMember) =>
        this.sortChannelMembers(firstMember, secondMember),
      );

    const limitedMembers = filteredMembers.slice(0, normalizedLimit);

    return {
      total: channel.members.length,
      admins: limitedMembers.filter(
        (member) => member.role === SpaceRole.ADMIN,
      ),
      members: limitedMembers.filter(
        (member) => member.role !== SpaceRole.ADMIN,
      ),
      nextCursor:
        filteredMembers.length > normalizedLimit
          ? (limitedMembers[limitedMembers.length - 1]?.userId ?? null)
          : null,
    };
  }

  async updateChannelSettings(
    channelId: string,
    userId: string,
    updateSettingDto: UpdateChannelSettingDto,
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: channel.spaceId,
          userId,
        },
      },
    });

    if (!spaceMember || spaceMember.role !== SpaceRole.ADMIN) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.SETTINGS_ACCESS_DENIED,
      );
    }

    const updatedSettings = await this.prisma.channelSetting.update({
      where: { channelId },
      data: updateSettingDto,
    });

    this.chatGateway.server
      .to(channelId)
      .emit(ChatEvent.CHANNEL_SETTING_UPDATED, {
        chatId: channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId,
        setting: updatedSettings,
      });

    return updatedSettings;
  }

  async updateMemberRole(
    channelId: string,
    userId: string,
    targetUserId: string,
    newRole: SpaceRole,
  ) {
    if (userId === targetUserId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.SELF_ROLE_CHANGE);
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    const requester = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });

    const space = await this.prisma.space.findUnique({
      where: { id: channel.spaceId },
      select: { createdBy: true },
    });

    if (!requester || !space || space.createdBy !== userId) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.ROLE_CHANGE_ACCESS_DENIED,
      );
    }

    const targetMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: { spaceId: channel.spaceId, userId: targetUserId },
      },
    });

    if (!targetMember) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MEMBER_NOT_IN_SPACE);
    }

    const updatedMember = await this.prisma.spaceMember.update({
      where: {
        spaceId_userId: { spaceId: channel.spaceId, userId: targetUserId },
      },
      data: { role: newRole },
    });

    const roleName = newRole === SpaceRole.ADMIN ? 'Admin' : 'Member';

    await this.chatGateway.sendSystemMessage(
      channelId,
      userId,
      `${userId} set ${targetUserId} as ${roleName}`,
    );

    await this.emitRoleUpdateToSpaceChannels(channel.spaceId, {
      userId: updatedMember.userId,
      role: updatedMember.role,
    });

    return updatedMember;
  }

  async muteChannel(channelId: string, userId: string, muted: boolean) {
    const member = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId },
      },
    });

    if (!member) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
    }

    const updatedMember = await this.prisma.channelMember.update({
      where: {
        channelId_userId: { channelId, userId },
      },
      data: { muted },
    });

    // Emit websocket event to user's private room to sync all sessions/tabs
    if (this.chatGateway?.server) {
      this.chatGateway.server
        .to(userId)
        .emit(ChatEvent.CONVERSATION_MUTE_UPDATED, {
          chatId: channelId,
          chatType: CHAT_CONTEXT_TYPE.CHANNEL,
          channelId,
          muted,
        });
    }

    return updatedMember;
  }

  async pinChannel(channelId: string, userId: string, pinned: boolean) {
    const member = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId },
      },
    });

    if (!member) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
    }

    return this.prisma.channelMember.update({
      where: {
        channelId_userId: { channelId, userId },
      },
      data: { pinned },
    });
  }

  async kickMember(channelId: string, userId: string, memberId: string) {
    if (userId === memberId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.SELF_KICK);
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    const requester = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });
    const target = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId: memberId } },
    });

    if (!requester || !target) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MEMBER_NOT_IN_SPACE);
    }
    const space = await this.prisma.space.findUnique({
      where: { id: channel.spaceId },
      select: { createdBy: true },
    });
    if (!space || space.createdBy !== userId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.KICK_ACCESS_DENIED);
    }

    const spaceChannels = await this.prisma.channel.findMany({
      where: { spaceId: channel.spaceId },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.spaceMember.delete({
        where: {
          spaceId_userId: { spaceId: channel.spaceId, userId: memberId },
        },
      });

      await tx.channelMember.deleteMany({
        where: {
          userId: memberId,
          channelId: {
            in: spaceChannels.map((spaceChannel) => spaceChannel.id),
          },
        },
      });
    });

    const targetRooms = [
      memberId,
      ...spaceChannels.map((spaceChannel) => spaceChannel.id),
    ];

    this.chatGateway.server.to(targetRooms).emit(ChatEvent.MEMBER_KICKED, {
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId,
      spaceId: channel.spaceId,
      userId: memberId,
    });

    return { success: true };
  }

  async updateChannelInfo(
    channelId: string,
    userId: string,
    data: { name: string },
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });

    const space = await this.prisma.space.findUnique({
      where: { id: channel.spaceId },
      select: { createdBy: true },
    });

    const isOwner = space && space.createdBy === userId;
    const isChannelCreator = channel.createdBy === userId;
    const isAdmin = spaceMember && spaceMember.role === SpaceRole.ADMIN;

    if (!spaceMember || (!isAdmin && !isChannelCreator && !isOwner)) {
      throw new ForbiddenException(CHANNEL_ERROR_MESSAGES.UPDATE_ACCESS_DENIED);
    }

    if (!data.name || data.name.trim().length === 0) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO,
      );
    }

    const updatedChannel = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        name: data.name.trim(),
      },
    });

    const profileMap =
      await this.userProfileSnapshotService.getProfilesByUserIds([userId]);
    const actorProfile = profileMap.get(userId);
    const content = `Channel name was updated to "${updatedChannel.name}" by ${actorProfile?.fullName || 'an admin'}`;
    await this.chatGateway.sendSystemMessage(channelId, userId, content);

    const payload = {
      id: channelId,
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId,
      name: updatedChannel.name,
    };

    this.chatGateway.server
      .to(channelId)
      .emit(ChatEvent.CONVERSATION_UPDATED, payload);

    return updatedChannel;
  }

  async leaveChannel(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });

    if (!spaceMember) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_SPACE);
    }

    if (channel.isDefault) {
      return this.leaveSpaceFromDefaultChannel(
        channelId,
        channel.spaceId,
        userId,
      );
    }

    const channelMember = await this.prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    });
    if (!channelMember) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_CHANNEL,
      );
    }

    await this.prisma.channelMember.delete({
      where: { channelId_userId: { channelId, userId } },
    });

    const remainingMembers = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    const targetRooms = [
      userId,
      channelId,
      ...remainingMembers.map((m) => m.userId),
    ];

    this.chatGateway.server.to(targetRooms).emit(ChatEvent.MEMBER_LEFT, {
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId,
      spaceId: channel.spaceId,
      userId,
      leftSpace: false,
    });

    await this.chatGateway.sendSystemMessage(
      channelId,
      userId,
      `${await this.getUserDisplayName(userId)} left the channel`,
    );

    return { success: true };
  }

  private async leaveSpaceFromDefaultChannel(
    channelId: string,
    spaceId: string,
    userId: string,
  ) {
    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!spaceMember) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_SPACE);
    }

    if (spaceMember.role === SpaceRole.ADMIN) {
      const adminCount = await this.prisma.spaceMember.count({
        where: { spaceId, role: SpaceRole.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException('Space must have at least one admin');
      }
    }

    const spaceChannels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });

    await this.chatGateway.sendSystemMessage(
      channelId,
      userId,
      `${await this.getUserDisplayName(userId)} left the space`,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.spaceMember.delete({
        where: { spaceId_userId: { spaceId, userId } },
      });
      await tx.channelMember.deleteMany({
        where: {
          userId,
          channelId: {
            in: spaceChannels.map((spaceChannel) => spaceChannel.id),
          },
        },
      });
    });

    this.chatGateway.server
      .to([userId, ...spaceChannels.map((spaceChannel) => spaceChannel.id)])
      .emit(ChatEvent.MEMBER_LEFT, {
        chatId: channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId,
        spaceId,
        userId,
        leftSpace: true,
      });

    return { success: true };
  }

  async disbandChannel(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    if (channel.isDefault) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.DEFAULT_CHANNEL_DELETE_PREVENTED,
      );
    }

    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });

    const spaceSetting = await (this.prisma as any).spaceSetting.findUnique({
      where: { spaceId: channel.spaceId },
    });
    const allowMemberDeleteOwnChannel =
      spaceSetting?.allowMemberDeleteOwnChannel ?? false;

    const isSpaceAdmin = spaceMember?.role === SpaceRole.ADMIN;
    const isChannelCreator = channel.createdBy === userId;

    if (!isSpaceAdmin && !(isChannelCreator && allowMemberDeleteOwnChannel)) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.DISBAND_ACCESS_DENIED,
      );
    }

    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    const spaceMembers = await this.prisma.spaceMember.findMany({
      where: { spaceId: channel.spaceId },
      select: { userId: true },
    });
    const space = await this.prisma.space.findUnique({
      where: { id: channel.spaceId },
      select: { name: true },
    });
    const profileByUserId = await this.getProfileMap([userId]);
    const actorProfile = profileByUserId.get(userId) ?? null;
    const actorName = this.getProfileDisplayName(actorProfile, userId);

    await this.prisma.channel.delete({
      where: { id: channelId },
    });

    const affectedUserIds = Array.from(
      new Set([
        ...members.map((member) => member.userId),
        ...spaceMembers.map((member) => member.userId),
      ]),
    );
    const targetRooms = [channelId, ...affectedUserIds];

    this.chatGateway.server
      .to(targetRooms)
      .emit(ChatEvent.CONVERSATION_DISBANDED, {
        eventType: 'channel_disbanded',
        chatId: channelId,
        chatType: CHAT_CONTEXT_TYPE.CHANNEL,
        channelId,
        channelName: channel.name,
        spaceId: channel.spaceId,
        spaceName: space?.name ?? null,
        affectedUserIds,
        leftSpace: false,
        actorProfile,
      });

    this.chatGateway.server.in(channelId).socketsLeave(channelId);
    this.publishChannelDisbandedNotifications({
      recipientIds: affectedUserIds,
      actorId: userId,
      actorName,
      actorAvatar: actorProfile?.avatarUrl,
      spaceId: channel.spaceId,
      spaceName: space?.name,
      channelId,
      channelName: channel.name,
    });

    return { success: true };
  }

  async getAvatarUploadPresignedUrl(
    channelId: string,
    userId: string,
    fileName: string,
    contentType: string,
  ) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });

    if (
      !spaceMember ||
      (spaceMember.role !== SpaceRole.ADMIN && channel.createdBy !== userId)
    ) {
      throw new ForbiddenException(CHANNEL_ERROR_MESSAGES.UPDATE_ACCESS_DENIED);
    }

    const { presignedUrl, s3Key } =
      await this.s3Service.generatePresignedUploadUrl(
        S3_UPLOAD_TYPE.AVATAR,
        channelId,
        fileName,
        contentType,
      );

    const fileUrl = getMediaUrl(s3Key);

    return { presignedUrl, s3Key, fileUrl };
  }

  async joinChannel(channelId: string, userId: string, userName?: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException('Channel not found');
    }

    const isSpaceMember = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: {
          spaceId: channel.spaceId,
          userId,
        },
      },
    });

    if (!isSpaceMember) {
      throw new BadRequestException('You are not a member of this space');
    }

    const isMember = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });

    if (isMember) {
      const joinedChannel = await this.prisma.channel.findUnique({
        where: { id: channelId },
        include: {
          setting: true,
          members: true,
        },
      });

      return this.mapChannelForClient(joinedChannel);
    }

    await this.prisma.channelMember.create({
      data: {
        channelId,
        userId,
      },
    });

    await this.chatGateway.sendSystemMessage(
      channelId,
      userId,
      `${userName || userId} joined the chat channel`,
    );

    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    const targetRooms = [channelId, ...members.map((m) => m.userId)];

    this.chatGateway.emitMemberJoin(targetRooms, {
      chatId: channelId,
      chatType: CHAT_CONTEXT_TYPE.CHANNEL,
      channelId,
      member: {
        channelId,
        userId,
        role: SpaceRole.MEMBER,
      },
    });

    const joinedChannel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        setting: true,
        members: true,
      },
    });

    return this.mapChannelForClient(joinedChannel);
  }
}
