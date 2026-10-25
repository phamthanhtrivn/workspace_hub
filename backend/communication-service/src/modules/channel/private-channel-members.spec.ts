import { NotFoundException } from '@nestjs/common';
import { ChannelVisibility, SpaceMember, SpaceRole } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrivateChannelMembersService } from './private-channel-members.service';
import { PrivateChannelMembersQueryDto } from './dto/private-channel-members-query.dto';

describe('Private channel member directory', () => {
  function fixture() {
    const members: SpaceMember[] = [
      'owner',
      ...Array.from(
        { length: 22 },
        (_, index) => `member-${String(index + 1).padStart(2, '0')}`,
      ),
    ].map((userId) => ({
      id: userId,
      userId,
      spaceId: 'space',
      joinedAt: new Date(0),
      role: SpaceRole.MEMBER,
    }));
    const prisma = {
      channel: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'private',
          spaceId: 'space',
          visibility: ChannelVisibility.PRIVATE,
          ownerId: 'owner',
          members: [
            { userId: 'owner', nickname: null },
            { userId: 'member-02', nickname: 'Nickname' },
          ],
        }),
      },
      spaceMember: {
        findUnique: jest.fn().mockResolvedValue(members[0]),
        findMany: jest
          .fn()
          .mockImplementation(
            ({ where }: { where: { userId?: { in: string[] } } }) =>
              Promise.resolve(
                members.filter(
                  (member) =>
                    !where.userId || where.userId.in.includes(member.userId),
                ),
              ),
          ),
      },
    };
    const profiles = {
      attachProfilesToMembers: jest.fn((rows: SpaceMember[]) =>
        Promise.resolve(
          rows.map((member) => ({
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
      typeof PrivateChannelMembersService
    >;
    const service = new PrivateChannelMembersService(
      prisma as unknown as Dependencies[0],
      profiles as unknown as Dependencies[1],
    );
    return { service, prisma, profiles };
  }

  it('returns all space members to the owner, ten per page, with joined status and the actual channel count', async () => {
    const { service } = fixture();
    const pages = await Promise.all(
      [1, 2, 3].map((page) =>
        service.getDirectory('private', 'owner', { page }),
      ),
    );
    expect(pages.map((page) => page.members.length)).toEqual([10, 10, 3]);
    expect(pages[0]).toMatchObject({
      canManage: true,
      ownerId: 'owner',
      memberCount: 2,
      pagination: { page: 1, pageSize: 10, total: 23, totalPages: 3 },
    });
    expect(pages[0].members[0]).toMatchObject({
      userId: 'owner',
      joined: true,
    });
    expect(pages[0].members[1]).toMatchObject({
      userId: 'member-02',
      joined: true,
      nickname: 'Nickname',
    });
    expect(
      pages.flatMap((page) => page.members).filter((member) => !member.joined),
    ).toHaveLength(21);
  });

  it('returns only current channel members to an ordinary member or space admin', async () => {
    const { service, prisma } = fixture();
    prisma.spaceMember.findUnique.mockResolvedValue({ role: SpaceRole.ADMIN });
    const page = await service.getDirectory('private', 'member-02', {});
    expect(page.canManage).toBe(false);
    expect(page.members.map((member) => member.userId)).toEqual([
      'owner',
      'member-02',
    ]);
    expect(page.pagination.total).toBe(2);
    expect(prisma.spaceMember.findMany).toHaveBeenCalledWith({
      where: { spaceId: 'space', userId: { in: ['owner', 'member-02'] } },
    });
  });

  it('searches across all eligible members and nicknames before paginating', async () => {
    const { service } = fixture();
    const page = await service.getDirectory('private', 'owner', {
      search: '  MEMBER-22@  ',
      page: 3,
    });
    expect(page.members.map((member) => member.userId)).toEqual(['member-22']);
    expect(page.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
    });
    expect(
      (await service.getDirectory('private', 'owner', { search: 'nickname' }))
        .members[0].userId,
    ).toBe('member-02');
    expect(
      (await service.getDirectory('private', 'owner', { search: 'absent' }))
        .members,
    ).toEqual([]);
  });

  it('denies nonmembers, removed space members, and public channels before loading the directory', async () => {
    const { service, prisma, profiles } = fixture();
    await expect(
      service.getDirectory('private', 'space-admin', {}),
    ).rejects.toThrow(NotFoundException);
    prisma.spaceMember.findUnique.mockResolvedValueOnce(null);
    await expect(service.getDirectory('private', 'owner', {})).rejects.toThrow(
      NotFoundException,
    );
    prisma.channel.findUnique.mockResolvedValueOnce({
      visibility: ChannelVisibility.PUBLIC,
    });
    await expect(service.getDirectory('public', 'owner', {})).rejects.toThrow(
      NotFoundException,
    );
    expect(profiles.attachProfilesToMembers).not.toHaveBeenCalled();
  });

  it.each(['0', '-1', '1.5', 'invalid'])(
    'rejects invalid page %s',
    async (page) => {
      expect(
        await validate(
          plainToInstance(PrivateChannelMembersQueryDto, { page }),
        ),
      ).not.toHaveLength(0);
    },
  );
});
