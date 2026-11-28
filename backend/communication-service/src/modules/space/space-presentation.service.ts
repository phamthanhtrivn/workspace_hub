import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, SpaceRole } from '@prisma/client';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { UserProfileSnapshotResponse } from '../user-profile-snapshot/types/user-profile-snapshot.types';
import {
  SPACE_MEMBER_SEARCH_DEFAULT_LIMIT,
  SPACE_MEMBER_SEARCH_MAX_LIMIT,
} from './types/space.enums';

@Injectable()
export class SpacePresentationService {
  constructor(
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly prisma: PrismaService,
  ) {}
  normalizeLimit(limit?: string | number) {
    const parsedLimit = Number(limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      return SPACE_MEMBER_SEARCH_DEFAULT_LIMIT;
    }
    return Math.min(Math.floor(parsedLimit), SPACE_MEMBER_SEARCH_MAX_LIMIT);
  }

  normalizeSearch(search?: string) {
    return search?.trim().toLowerCase() ?? '';
  }

  async getUserDisplayName(userId: string) {
    const profiles = await this.userProfileSnapshotService.getProfilesByUserIds(
      [userId],
    );
    return (
      profiles.get(userId)?.fullName || profiles.get(userId)?.email || userId
    );
  }

  async getProfileMap(userIds: string[]) {
    return this.userProfileSnapshotService.getProfilesByUserIds(userIds);
  }

  getProfileDisplayName(
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

  matchesMemberSearch(
    member: {
      userId: string;
      profile?: Pick<UserProfileSnapshotResponse, 'fullName' | 'email'> | null;
    },
    search: string,
  ) {
    if (!search) return true;
    return [member.userId, member.profile?.fullName, member.profile?.email]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(search));
  }

  async mapChannelForClient<
    T extends Prisma.ChannelGetPayload<{ include: { members: true } }>,
  >(channel: T, userId?: string, roleByUserId?: Map<string, SpaceRole>) {
    let resolvedRoleMap = roleByUserId;

    if (!resolvedRoleMap) {
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
      resolvedRoleMap = new Map(
        roles.map((member) => [member.userId, member.role]),
      );
    }

    let unreadCount = 0;
    if (userId) {
      const currentMember = channel.members.find(
        (member) => member.userId === userId,
      );
      if (currentMember) {
        const referenceDate =
          currentMember.lastReadAt || currentMember.joinedAt;
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
        role: resolvedRoleMap.get(member.userId) ?? SpaceRole.MEMBER,
      })),
    };
  }
}
