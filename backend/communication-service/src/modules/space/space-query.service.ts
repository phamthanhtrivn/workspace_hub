import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpaceRole, ChannelVisibility } from '@prisma/client';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { SPACE_ERROR_MESSAGES } from './types/space.enums';
import { SpaceAccessService } from './space-access.service';
import { SpaceSettingsService } from './space-settings.service';
import { SpacePresentationService } from './space-presentation.service';

@Injectable()
export class SpaceQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly access: SpaceAccessService,
    private readonly settings: SpaceSettingsService,
    private readonly presentation: SpacePresentationService,
  ) {}
  async getUserSpaces(userId: string) {
    const spaces = await this.prisma.space.findMany({
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

    const creatorIds = Array.from(new Set(spaces.map((s) => s.createdBy)));
    const profiles =
      await this.userProfileSnapshotService.getProfilesByUserIds(creatorIds);

    return spaces.map((space) => ({
      ...space,
      creatorProfile: profiles.get(space.createdBy) ?? null,
    }));
  }

  async getSpaceDetails(userId: string, spaceId: string) {
    await this.access.assertSpaceMember(spaceId, userId);
    const space = await this.prisma.space.findUnique({
      where: { id: spaceId },
      include: {
        _count: {
          select: {
            members: true,
            channels: {
              where: {
                OR: [
                  { visibility: ChannelVisibility.PUBLIC },
                  { members: { some: { userId } } },
                ],
              },
            },
          },
        },
      },
    });

    if (!space) {
      throw new BadRequestException(SPACE_ERROR_MESSAGES.SPACE_NOT_FOUND);
    }

    const { _count, ...spaceDetails } = space;
    const profiles = await this.userProfileSnapshotService.getProfilesByUserIds(
      [space.createdBy],
    );

    return {
      ...spaceDetails,
      setting: await this.settings.getSpaceSetting(spaceId),
      creatorProfile: profiles.get(space.createdBy) ?? null,
      memberCount: _count.members,
      channelCount: _count.channels,
    };
  }

  async getSpaceMembers(
    userId: string,
    spaceId: string,
    search?: string,
    limit?: string | number,
  ) {
    await this.access.assertSpaceMember(spaceId, userId);

    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId },
      orderBy: { joinedAt: 'asc' },
    });
    const enrichedMembers =
      await this.userProfileSnapshotService.attachProfilesToMembers(members);
    const normalizedSearch = this.presentation.normalizeSearch(search);
    const normalizedLimit = this.presentation.normalizeLimit(limit);
    const filteredMembers = enrichedMembers
      .filter((member) =>
        this.presentation.matchesMemberSearch(member, normalizedSearch),
      )
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
}
