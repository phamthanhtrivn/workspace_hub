import { BadRequestException } from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { ChannelService } from './channel.service';
import { SPACE_ERROR_MESSAGES } from '../space/types/space.enums';

describe('Channel routes that remove space membership', () => {
  const userId = 'member-1';
  const spaceId = 'space-1';
  const channelId = 'general-1';

  function createService({
    projectId = null as string | null,
    isDefault = true,
    role = SpaceRole.MEMBER,
    isOwner = false,
    adminCount = 2,
  } = {}) {
    const prisma = {
      channel: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: channelId, spaceId, isDefault }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: channelId }, { id: 'channel-2' }]),
      },
      space: {
        findUnique: jest.fn().mockResolvedValue({
          id: spaceId,
          projectId,
          createdBy: isOwner ? userId : 'owner-1',
        }),
      },
      spaceMember: {
        findUnique: jest.fn().mockResolvedValue({ userId, role }),
        findMany: jest.fn().mockResolvedValue([{ userId }]),
        count: jest.fn().mockResolvedValue(adminCount),
        delete: jest.fn().mockResolvedValue({}),
      },
      channelMember: {
        findUnique: jest.fn().mockResolvedValue({ userId }),
        findMany: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (operation: (transaction: typeof prisma) => Promise<unknown>) =>
        operation(prisma),
    );
    const publisher = {
      sendSystemMessage: jest.fn().mockResolvedValue(undefined),
      publishMemberLeft: jest.fn(),
      publishMemberKicked: jest.fn(),
    };
    type Dependencies = ConstructorParameters<typeof ChannelService>;
    const service = new ChannelService(
      prisma as unknown as Dependencies[0],
      publisher as unknown as Dependencies[1],
      {} as Dependencies[2],
      {
        getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
      } as unknown as Dependencies[3],
      {} as Dependencies[4],
    );
    return { service, prisma, publisher };
  }

  it.each([
    { role: SpaceRole.MEMBER },
    { role: SpaceRole.ADMIN },
    { isOwner: true, role: SpaceRole.ADMIN },
  ])(
    'blocks leaving a project space through its default channel: %j',
    async (permissions) => {
      const { service, prisma, publisher } = createService({
        ...permissions,
        projectId: 'project-1',
      });
      await expect(service.leaveChannel(channelId, userId)).rejects.toThrow(
        new BadRequestException(
          SPACE_ERROR_MESSAGES.PROJECT_SPACE_MANAGED_BY_PROJECT,
        ),
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.spaceMember.delete).not.toHaveBeenCalled();
      expect(prisma.channelMember.deleteMany).not.toHaveBeenCalled();
      expect(publisher.sendSystemMessage).not.toHaveBeenCalled();
      expect(publisher.publishMemberLeft).not.toHaveBeenCalled();
    },
  );

  it('still allows leaving an ordinary channel in a project space', async () => {
    const { service, prisma, publisher } = createService({
      projectId: 'project-1',
      isDefault: false,
    });
    await expect(service.leaveChannel(channelId, userId)).resolves.toEqual({
      success: true,
    });
    expect(prisma.channelMember.delete).toHaveBeenCalledWith({
      where: { channelId_userId: { channelId, userId } },
    });
    expect(prisma.spaceMember.delete).not.toHaveBeenCalled();
    expect(prisma.channelMember.deleteMany).not.toHaveBeenCalled();
    expect(publisher.publishMemberLeft).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ leftSpace: false }),
    );
  });

  it('removes a standalone-space member from the space and every channel atomically', async () => {
    const { service, prisma, publisher } = createService();
    await expect(service.leaveChannel(channelId, userId)).resolves.toEqual({
      success: true,
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.spaceMember.delete).toHaveBeenCalledWith({
      where: { spaceId_userId: { spaceId, userId } },
    });
    expect(prisma.channelMember.deleteMany).toHaveBeenCalledWith({
      where: { userId, channelId: { in: [channelId, 'channel-2'] } },
    });
    expect(publisher.publishMemberLeft).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ leftSpace: true, spaceId, userId }),
    );
  });

  it.each([
    [{ isOwner: true }, SPACE_ERROR_MESSAGES.OWNER_CANNOT_LEAVE],
    [{ role: SpaceRole.ADMIN, adminCount: 1 }, SPACE_ERROR_MESSAGES.LAST_ADMIN],
  ] as const)(
    'preserves standalone owner/last-admin protections: %j',
    async (permissions, message) => {
      const { service, prisma } = createService(permissions);
      await expect(service.leaveChannel(channelId, userId)).rejects.toThrow(
        message,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('also prevents a channel admin from removing someone directly from a project space', async () => {
    const { service, prisma, publisher } = createService({
      projectId: 'project-1',
      role: SpaceRole.ADMIN,
    });
    prisma.spaceMember.findUnique
      .mockResolvedValueOnce({ userId, role: SpaceRole.ADMIN })
      .mockResolvedValueOnce({ userId: 'target-1', role: SpaceRole.MEMBER });
    await expect(
      service.kickMember(channelId, userId, 'target-1'),
    ).rejects.toThrow(SPACE_ERROR_MESSAGES.PROJECT_SPACE_MANAGED_BY_PROJECT);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(publisher.publishMemberKicked).not.toHaveBeenCalled();
  });
});
