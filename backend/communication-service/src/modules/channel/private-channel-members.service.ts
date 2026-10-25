import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelVisibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { PrivateChannelMembersQueryDto } from './dto/private-channel-members-query.dto';
import {
  CHANNEL_ERROR_MESSAGES,
  PRIVATE_CHANNEL_MEMBER_PAGE_SIZE,
} from './types/channel.enums';
import { PrivateChannelMembersResponse } from './types/private-channel-members.types';

@Injectable()
export class PrivateChannelMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: UserProfileSnapshotService,
  ) {}

  async getDirectory(
    channelId: string,
    userId: string,
    query: PrivateChannelMembersQueryDto,
  ): Promise<PrivateChannelMembersResponse> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { members: { select: { userId: true, nickname: true } } },
    });
    if (
      !channel ||
      channel.visibility !== ChannelVisibility.PRIVATE ||
      !channel.members.some((member) => member.userId === userId)
    ) {
      throw new NotFoundException(CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED);
    }
    const spaceMember = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId: channel.spaceId, userId } },
    });
    if (!spaceMember)
      throw new NotFoundException(CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED);
    const canManage = channel.ownerId === userId;
    const channelMembers = new Map(
      channel.members.map((member) => [member.userId, member]),
    );
    const spaceMembers = await this.prisma.spaceMember.findMany({
      where: {
        spaceId: channel.spaceId,
        ...(!canManage ? { userId: { in: [...channelMembers.keys()] } } : {}),
      },
    });
    const enriched = await this.profiles.attachProfilesToMembers(spaceMembers);
    const search = query.search?.trim().toLowerCase() ?? '';
    const members = enriched
      .map((member) => ({
        ...member,
        joined: channelMembers.has(member.userId),
        nickname: channelMembers.get(member.userId)?.nickname ?? null,
      }))
      .filter((member) =>
        [
          member.userId,
          member.nickname,
          member.profile?.fullName,
          member.profile?.email,
        ].some((value) => value?.toLowerCase().includes(search)),
      )
      .sort(
        (first, second) =>
          Number(second.userId === channel.ownerId) -
            Number(first.userId === channel.ownerId) ||
          Number(second.joined) - Number(first.joined) ||
          (
            first.nickname ||
            first.profile?.fullName ||
            first.profile?.email ||
            first.userId
          ).localeCompare(
            second.nickname ||
              second.profile?.fullName ||
              second.profile?.email ||
              second.userId,
          ) ||
          first.userId.localeCompare(second.userId),
      );
    const total = members.length;
    const totalPages = Math.max(
      1,
      Math.ceil(total / PRIVATE_CHANNEL_MEMBER_PAGE_SIZE),
    );
    const page = Math.min(query.page ?? 1, totalPages);
    return {
      ownerId: channel.ownerId,
      canManage,
      memberCount: channel.members.length,
      members: members.slice(
        (page - 1) * PRIVATE_CHANNEL_MEMBER_PAGE_SIZE,
        page * PRIVATE_CHANNEL_MEMBER_PAGE_SIZE,
      ),
      pagination: {
        page,
        pageSize: PRIVATE_CHANNEL_MEMBER_PAGE_SIZE,
        total,
        totalPages,
      },
    };
  }
}
