import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChannelVisibility } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { CHANNEL_ERROR_MESSAGES } from '../channel/types/channel.enums';
import { SpaceMemberCandidatesQueryDto } from './dto/space-member-candidates-query.dto';
import {
  SPACE_ERROR_MESSAGES,
  SPACE_MEMBER_CANDIDATES_PAGE_SIZE,
} from './types/space.enums';
import { SpaceMemberCandidatesResponse } from './types/space-member-candidates.types';

@Injectable()
export class SpaceMemberCandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: UserProfileSnapshotService,
  ) {}

  async getCandidates(
    userId: string,
    spaceId: string,
    query: SpaceMemberCandidatesQueryDto,
  ): Promise<SpaceMemberCandidatesResponse> {
    const membership = await this.prisma.spaceMember.findUnique({
      where: { spaceId_userId: { spaceId, userId } },
    });
    if (!membership)
      throw new ForbiddenException(SPACE_ERROR_MESSAGES.NOT_MEMBER);

    const excludedIds = new Set([userId]);
    if (query.channelId) {
      const channel = await this.prisma.channel.findFirst({
        where: {
          id: query.channelId,
          spaceId,
          visibility: ChannelVisibility.PRIVATE,
          ownerId: userId,
          members: { some: { userId } },
        },
        select: { id: true },
      });
      if (!channel)
        throw new NotFoundException(
          CHANNEL_ERROR_MESSAGES.PRIVATE_ACCESS_DENIED,
        );
      const members = await this.prisma.channelMember.findMany({
        where: { channelId: channel.id },
        select: { userId: true },
      });
      for (const member of members) excludedIds.add(member.userId);
    }

    const members = await this.prisma.spaceMember.findMany({
      where: { spaceId, userId: { notIn: [...excludedIds] } },
    });
    const enriched = await this.profiles.attachProfilesToMembers(members);
    const search = query.search?.trim().toLowerCase() ?? '';
    // Match the existing space member search, then paginate the eligible list.
    const candidates = enriched
      .filter((member) =>
        [member.userId, member.profile?.fullName, member.profile?.email].some(
          (value) => value?.toLowerCase().includes(search),
        ),
      )
      .sort((first, second) => {
        const firstName =
          first.profile?.fullName || first.profile?.email || first.userId;
        const secondName =
          second.profile?.fullName || second.profile?.email || second.userId;
        return (
          firstName.localeCompare(secondName) ||
          first.userId.localeCompare(second.userId)
        );
      });
    const total = candidates.length;
    const totalPages = Math.max(
      1,
      Math.ceil(total / SPACE_MEMBER_CANDIDATES_PAGE_SIZE),
    );
    const page = Math.min(query.page ?? 1, totalPages);
    const offset = (page - 1) * SPACE_MEMBER_CANDIDATES_PAGE_SIZE;
    return {
      members: candidates.slice(
        offset,
        offset + SPACE_MEMBER_CANDIDATES_PAGE_SIZE,
      ),
      pagination: {
        page,
        pageSize: SPACE_MEMBER_CANDIDATES_PAGE_SIZE,
        total,
        totalPages,
      },
    };
  }
}
