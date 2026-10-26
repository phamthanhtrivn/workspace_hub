import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SpaceRole } from '@prisma/client';
import { ChannelService } from './channel.service';
import { CHANNEL_ERROR_MESSAGES } from './types/channel.enums';

describe('Channel name updates', () => {
  const channelId = 'channel-1';
  const userId = 'user-1';

  function createService({
    isDefault = false,
    role = SpaceRole.MEMBER as SpaceRole,
    isOwner = false,
    isCreator = false,
    isMember = true,
  } = {}) {
    const channel = {
      id: channelId,
      name: 'general',
      spaceId: 'space-1',
      isDefault,
      createdBy: isCreator ? userId : 'creator-1',
    };
    const prisma = {
      channel: {
        findUnique: jest.fn().mockResolvedValue(channel),
        update: jest.fn().mockResolvedValue({ ...channel, name: 'renamed' }),
      },
      spaceMember: {
        findUnique: jest.fn().mockResolvedValue(isMember ? { role } : null),
      },
      space: {
        findUnique: jest.fn().mockResolvedValue({
          createdBy: isOwner ? userId : 'owner-1',
        }),
      },
    };
    const publisher = {
      sendSystemMessage: jest.fn().mockResolvedValue(undefined),
      publishConversationUpdated: jest.fn(),
    };
    const profiles = {
      getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
    };
    type Dependencies = ConstructorParameters<typeof ChannelService>;
    const service = new ChannelService(
      prisma as unknown as Dependencies[0],
      publisher as unknown as Dependencies[1],
      {} as Dependencies[2],
      profiles as unknown as Dependencies[3],
      {} as Dependencies[4],
      {} as never,
    );
    return { service, prisma, publisher, profiles };
  }

  it.each([
    ['owner', { isOwner: true }],
    ['admin', { role: SpaceRole.ADMIN }],
    ['creator', { isCreator: true }],
  ] as const)(
    'blocks default-channel renaming by the %s without side effects',
    async (_actor, options) => {
      const { service, prisma, publisher, profiles } = createService({
        ...options,
        isDefault: true,
      });

      await expect(
        service.updateChannelInfo(channelId, userId, { name: 'renamed' }),
      ).rejects.toThrow(
        new BadRequestException('Default channels cannot be renamed'),
      );
      expect(prisma.channel.update).not.toHaveBeenCalled();
      expect(profiles.getProfilesByUserIds).not.toHaveBeenCalled();
      expect(publisher.sendSystemMessage).not.toHaveBeenCalled();
      expect(publisher.publishConversationUpdated).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['owner', { isOwner: true }],
    ['admin', { role: SpaceRole.ADMIN }],
    ['creator', { isCreator: true }],
  ] as const)(
    'still lets the %s rename a regular channel, even one named general',
    async (_actor, options) => {
      const { service, prisma, publisher } = createService(options);

      await expect(
        service.updateChannelInfo(channelId, userId, { name: ' renamed ' }),
      ).resolves.toMatchObject({ name: 'renamed' });
      expect(prisma.channel.update).toHaveBeenCalledWith({
        where: { id: channelId },
        data: { name: 'renamed' },
      });
      expect(publisher.sendSystemMessage).toHaveBeenCalledTimes(1);
      expect(publisher.publishConversationUpdated).toHaveBeenCalledWith(
        channelId,
        expect.objectContaining({ channelId, name: 'renamed' }),
      );
    },
  );

  it.each([
    { isDefault: false },
    { isDefault: true },
    { isDefault: true, isMember: false, isCreator: true },
  ])('preserves access checks for unauthorized users: %j', async (options) => {
    const { service, prisma, publisher } = createService(options);

    await expect(
      service.updateChannelInfo(channelId, userId, { name: 'renamed' }),
    ).rejects.toThrow(
      new ForbiddenException(CHANNEL_ERROR_MESSAGES.UPDATE_ACCESS_DENIED),
    );
    expect(prisma.channel.update).not.toHaveBeenCalled();
    expect(publisher.publishConversationUpdated).not.toHaveBeenCalled();
  });

  it('preserves not-found and blank-name validation', async () => {
    const { service, prisma } = createService({ isOwner: true });
    await expect(
      service.updateChannelInfo(channelId, userId, { name: '   ' }),
    ).rejects.toThrow(CHANNEL_ERROR_MESSAGES.MISSING_REQUIRED_INFO);
    prisma.channel.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.updateChannelInfo(channelId, userId, { name: 'renamed' }),
    ).rejects.toThrow(CHANNEL_ERROR_MESSAGES.CHANNEL_NOT_FOUND);
    expect(prisma.channel.update).not.toHaveBeenCalled();
  });
});
