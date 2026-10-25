import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SpaceMember, SpaceRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SpaceMemberCandidatesService } from './space-member-candidates.service';
import { SpaceMemberCandidatesQueryDto } from './dto/space-member-candidates-query.dto';

describe('Space member candidate pages', () => {
  function fixture(count = 23) {
    const members: SpaceMember[] = [
      'owner',
      ...Array.from(
        { length: count },
        (_, index) => `member-${String(index + 1).padStart(3, '0')}`,
      ),
    ].map((userId) => ({
      id: userId,
      userId,
      spaceId: 'space',
      role: SpaceRole.MEMBER,
      joinedAt: new Date(0),
    }));
    const prisma = {
      spaceMember: {
        findUnique: jest.fn().mockResolvedValue(members[0]),
        findMany: jest
          .fn()
          .mockImplementation(
            ({ where }: { where: { userId: { notIn: string[] } } }) =>
              members
                .filter((member) => !where.userId.notIn.includes(member.userId))
                .reverse(),
          ),
      },
      channel: { findFirst: jest.fn().mockResolvedValue({ id: 'private' }) },
      channelMember: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'owner' }]),
      },
    };
    const profiles = {
      attachProfilesToMembers: jest.fn((candidates: SpaceMember[]) =>
        Promise.resolve(
          candidates.map((member) => ({
            ...member,
            profile: {
              id: member.userId,
              userId: member.userId,
              fullName: member.userId,
              email: `${member.userId}@example.test`,
              avatarUrl: null,
            },
          })),
        ),
      ),
    };
    type Dependencies = ConstructorParameters<
      typeof SpaceMemberCandidatesService
    >;
    const service = new SpaceMemberCandidatesService(
      prisma as unknown as Dependencies[0],
      profiles as unknown as Dependencies[1],
    );
    return { service, prisma, profiles };
  }

  it('returns ten eligible members per page and the remaining members on the last page', async () => {
    const { service } = fixture();
    const first = await service.getCandidates('owner', 'space', {});
    const second = await service.getCandidates('owner', 'space', { page: 2 });
    const last = await service.getCandidates('owner', 'space', { page: 3 });
    expect(first.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
    expect(first.members).toHaveLength(10);
    expect(second.members).toHaveLength(10);
    expect(last.members).toHaveLength(3);
    expect(first.members[0].userId).toBe('member-001');
    expect(second.members[0].userId).toBe('member-011');
    expect(last.members[0].userId).toBe('member-021');
    expect(
      new Set(
        [...first.members, ...second.members, ...last.members].map(
          (member) => member.userId,
        ),
      ).size,
    ).toBe(23);
  });

  it('does not truncate candidates to the old 500-member search limit', async () => {
    const { service } = fixture(501);
    const last = await service.getCandidates('owner', 'space', { page: 51 });
    expect(last.pagination).toEqual({
      page: 51,
      pageSize: 10,
      total: 501,
      totalPages: 51,
    });
    expect(last.members.map((member) => member.userId)).toEqual(['member-501']);
  });

  it('excludes current channel members before counting and slicing pages', async () => {
    const { service, prisma } = fixture();
    prisma.channelMember.findMany.mockResolvedValue(
      [
        'owner',
        ...Array.from({ length: 7 }, (_, index) => `member-00${index + 1}`),
      ].map((userId) => ({ userId })),
    );
    const result = await service.getCandidates('owner', 'space', {
      channelId: 'private',
    });
    expect(result.pagination.total).toBe(16);
    expect(result.members).toHaveLength(10);
    expect(result.members[0].userId).toBe('member-008');
    expect(prisma.channel.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'private',
        spaceId: 'space',
        ownerId: 'owner',
        visibility: 'PRIVATE',
        members: { some: { userId: 'owner' } },
      },
      select: { id: true },
    });
  });

  it('searches the full eligible list before pagination', async () => {
    const { service } = fixture();
    const result = await service.getCandidates('owner', 'space', {
      search: '  MEMBER-02  ',
    });
    expect(result.pagination.total).toBe(4);
    expect(result.members.map((member) => member.userId)).toEqual([
      'member-020',
      'member-021',
      'member-022',
      'member-023',
    ]);
  });

  it('clamps an outdated last page after membership changes and handles no matches', async () => {
    const { service } = fixture();
    expect(
      (await service.getCandidates('owner', 'space', { page: 100 })).pagination
        .page,
    ).toBe(3);
    const empty = await service.getCandidates('owner', 'space', {
      search: 'no-match',
      page: 3,
    });
    expect(empty).toEqual({
      members: [],
      pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    });
  });

  it('denies outsiders and does not expose private membership to a different owner/admin', async () => {
    const { service, prisma, profiles } = fixture();
    prisma.spaceMember.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.getCandidates('outsider', 'space', {}),
    ).rejects.toThrow(ForbiddenException);
    prisma.channel.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.getCandidates('space-admin', 'space', { channelId: 'private' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.channelMember.findMany).not.toHaveBeenCalled();
    expect(profiles.attachProfilesToMembers).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '1.5', 'invalid'])(
    'rejects invalid query page %s',
    async (page) => {
      expect(
        await validate(
          plainToInstance(SpaceMemberCandidatesQueryDto, { page }),
        ),
      ).not.toHaveLength(0);
    },
  );

  it('parses integer page values and rejects malformed channel IDs', async () => {
    const query = plainToInstance(SpaceMemberCandidatesQueryDto, { page: '2' });
    expect(await validate(query)).toHaveLength(0);
    expect(query.page).toBe(2);
    expect(
      await validate(
        plainToInstance(SpaceMemberCandidatesQueryDto, {
          channelId: 'invalid',
        }),
      ),
    ).not.toHaveLength(0);
  });
});
