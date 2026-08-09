import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { ChatGateway } from '../chat/chat.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { S3Service } from 'src/infrastructure/s3/s3.service';
import { UpdateConversationSettingDto } from './dto/update-channel-setting.dto';
import { ChatEvent } from '../chat/chat.events';
import { getMediaUrl } from 'src/common/utils/file.util';
import { S3_UPLOAD_TYPE } from 'src/common/types/file.enums';
import { CHANNEL_ERROR_MESSAGES } from './types/channel.enums';

@Injectable()
export class ChannelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly s3Service: S3Service,
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

    return Promise.all(
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

        return {
          ...channel,
          type: 'GROUP',
          unreadCount,
        };
      }),
    );
  }

  private async getSpaceChannelIds(spaceId: string) {
    const channels = await this.prisma.channel.findMany({
      where: { spaceId },
      select: { id: true },
    });

    return channels.map((channel) => channel.id);
  }

  private async emitRoleUpdateToSpaceChannels(
    spaceId: string,
    member: { userId: string; role: SpaceRole },
  ) {
    const channelIds = await this.getSpaceChannelIds(spaceId);

    channelIds.forEach((channelId) => {
      this.chatGateway.server.to(channelId).emit(ChatEvent.MEMBER_ROLE_UPDATED, {
        channelId,
        member,
      });
    });
  }

  async updateConversationSettings(
    channelId: string,
    userId: string,
    updateSettingDto: UpdateConversationSettingDto,
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

    if (
      !spaceMember ||
      (spaceMember.role !== SpaceRole.OWNER &&
        spaceMember.role !== SpaceRole.ADMIN)
    ) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.SETTINGS_ACCESS_DENIED);
    }

    const updatedSettings = await this.prisma.channelSetting.update({
      where: { channelId },
      data: updateSettingDto,
    });

    this.chatGateway.server.to(channelId).emit(ChatEvent.GROUP_SETTING_UPDATED, {
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
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.SELF_ROLE_CHANGE,
      );
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

    if (!requester || requester.role !== SpaceRole.OWNER) {
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
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MEMBER_NOT_IN_SPACE,
      );
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

  async muteConversation(channelId: string, userId: string, muted: boolean) {
    const member = await this.prisma.channelMember.findUnique({
      where: {
        channelId_userId: { channelId, userId },
      },
    });

    if (!member) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_GROUP,
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
          channelId,
          muted,
        });
    }

    return updatedMember;
  }

  async transferOwnership(
    channelId: string,
    userId: string,
    newOwnerId: string,
  ) {
    if (userId === newOwnerId) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.SELF_OWNERSHIP_TRANSFER);
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

    if (!requester || requester.role !== SpaceRole.OWNER) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.TRANSFER_ACCESS_DENIED,
      );
    }

    const newOwner = await this.prisma.spaceMember.findUnique({
      where: {
        spaceId_userId: { spaceId: channel.spaceId, userId: newOwnerId },
      },
    });

    if (!newOwner) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.MEMBER_NOT_IN_SPACE,
      );
    }

    await this.prisma.$transaction([
      this.prisma.spaceMember.update({
        where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
        data: { role: SpaceRole.MEMBER },
      }),
      this.prisma.spaceMember.update({
        where: {
          spaceId_userId: { spaceId: channel.spaceId, userId: newOwnerId },
        },
        data: { role: SpaceRole.OWNER },
      }),
    ]);

    await this.emitRoleUpdateToSpaceChannels(channel.spaceId, {
      userId,
      role: SpaceRole.MEMBER,
    });
    await this.emitRoleUpdateToSpaceChannels(channel.spaceId, {
      userId: newOwnerId,
      role: SpaceRole.OWNER,
    });

    await this.chatGateway.sendSystemMessage(
      channelId,
      userId,
      `${userId} transferred ownership to ${newOwnerId}`,
    );

    return { success: true };
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
    if (target.role === SpaceRole.OWNER) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.KICK_ACCESS_DENIED);
    }
    if (
      requester.role === SpaceRole.MEMBER ||
      (requester.role === SpaceRole.ADMIN && target.role !== SpaceRole.MEMBER)
    ) {
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
          channelId: { in: spaceChannels.map((spaceChannel) => spaceChannel.id) },
        },
      });
    });

    const targetRooms = [
      memberId,
      ...spaceChannels.map((spaceChannel) => spaceChannel.id),
    ];

    this.chatGateway.server.to(targetRooms).emit(ChatEvent.MEMBER_KICKED, {
      channelId,
      spaceId: channel.spaceId,
      userId: memberId,
    });

    return { success: true };
  }

  async updateGroupInfo(
    channelId: string,
    userId: string,
    data: { name?: string; avatarUrl?: string },
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
      (spaceMember.role !== SpaceRole.OWNER &&
        spaceMember.role !== SpaceRole.ADMIN &&
        channel.createdBy !== userId)
    ) {
      throw new ForbiddenException(CHANNEL_ERROR_MESSAGES.UPDATE_ACCESS_DENIED);
    }

    if (data.name !== undefined && data.name.trim().length === 0) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    }

    const updatedChannel = await this.prisma.channel.update({
      where: { id: channelId },
      data: {
        name: data.name !== undefined ? data.name.trim() : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
      },
    });

    const payload = {
      id: channelId,
      channelId,
      name: updatedChannel.name,
      avatarUrl: updatedChannel.avatarUrl,
    };

    this.chatGateway.server.to(channelId).emit(ChatEvent.CONVERSATION_UPDATED, payload);

    return updatedChannel;
  }

  async leaveConversation(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    const member = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });

    if (!member) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.NOT_MEMBER_OF_SPACE,
      );
    }

    if (member.role === SpaceRole.OWNER) {
      const otherOwners = await this.prisma.spaceMember.findMany({
        where: {
          spaceId: channel.spaceId,
          role: SpaceRole.OWNER,
          userId: { not: userId },
        },
      });

      if (otherOwners.length === 0) {
        throw new BadRequestException(
          CHANNEL_ERROR_MESSAGES.OWNER_LEAVE_PREVENTED,
        );
      }
    }

    const spaceChannels = await this.prisma.channel.findMany({
      where: { spaceId: channel.spaceId },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.spaceMember.delete({
        where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
      });

      for (const ch of spaceChannels) {
        await tx.channelMember.deleteMany({
          where: { channelId: ch.id, userId },
        });
      }
    });

    const remainingMembers = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });
    const targetRooms = [
      userId,
      ...spaceChannels.map((spaceChannel) => spaceChannel.id),
      ...remainingMembers.map((m) => m.userId),
    ];

    this.chatGateway.server.to(targetRooms).emit(ChatEvent.MEMBER_LEFT, {
      channelId,
      spaceId: channel.spaceId,
      userId,
    });

    await this.chatGateway.sendSystemMessage(
      channelId,
      userId,
      `${userId} left the space`,
    );

    return { success: true };
  }

  async disbandConversation(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    }

    if (channel.isDefault) {
      throw new BadRequestException(CHANNEL_ERROR_MESSAGES.DEFAULT_CHANNEL_DELETE_PREVENTED);
    }

    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });

    if (
      !spaceMember ||
      (spaceMember.role !== SpaceRole.OWNER &&
        spaceMember.role !== SpaceRole.ADMIN &&
        channel.createdBy !== userId)
    ) {
      throw new BadRequestException(
        CHANNEL_ERROR_MESSAGES.DISBAND_ACCESS_DENIED,
      );
    }

    const members = await this.prisma.channelMember.findMany({
      where: { channelId },
      select: { userId: true },
    });

    await this.prisma.channel.delete({
      where: { id: channelId },
    });

    const targetRooms = [channelId, ...members.map((m) => m.userId)];

    this.chatGateway.server
      .to(targetRooms)
      .emit(ChatEvent.CONVERSATION_DISBANDED, {
        channelId,
      });

    this.chatGateway.server.in(channelId).socketsLeave(channelId);

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
      (spaceMember.role !== SpaceRole.OWNER &&
        spaceMember.role !== SpaceRole.ADMIN &&
        channel.createdBy !== userId)
    ) {
      throw new ForbiddenException(
        CHANNEL_ERROR_MESSAGES.UPDATE_ACCESS_DENIED,
      );
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
}
