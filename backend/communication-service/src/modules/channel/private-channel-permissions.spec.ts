import { ChannelVisibility, SpaceRole } from '@prisma/client';
import { ChannelService } from './channel.service';

describe('Private channel settings permissions', () => {
  function fixture(actorId: string, role: SpaceRole = SpaceRole.ADMIN) {
    const channel = {
      id: 'private',
      name: 'planning',
      spaceId: 'space',
      visibility: ChannelVisibility.PRIVATE,
      ownerId: 'successor',
      createdBy: 'creator',
      isDefault: false,
      space: { projectId: 'project', createdBy: 'space-owner' },
    };
    const prisma = {
      channel: {
        findUnique: jest.fn().mockResolvedValue(channel),
        update: jest.fn().mockResolvedValue(channel),
        delete: jest.fn(),
      },
      space: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            name: 'Project space',
            createdBy: 'space-owner',
          }),
      },
      spaceMember: {
        findUnique: jest.fn().mockResolvedValue({ userId: actorId, role }),
        findMany: jest
          .fn()
          .mockResolvedValue([
            { userId: 'space-owner' },
            { userId: 'outsider' },
          ]),
      },
      spaceSetting: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ allowMemberDeleteOwnChannel: false }),
      },
      channelSetting: {
        update: jest.fn().mockResolvedValue({ allowSendMessage: false }),
      },
      channelMember: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ userId: 'successor' }, { userId: 'member' }]),
      },
    };
    const publisher = {
      publishChannelSettingUpdated: jest.fn(),
      publishConversationUpdated: jest.fn(),
      sendSystemMessage: jest.fn(),
      publishConversationDisbanded: jest.fn(),
      leaveRoom: jest.fn(),
    };
    const s3 = { generatePresignedAvatarUrl: jest.fn() };
    const profiles = {
      getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
    };
    type Dependencies = ConstructorParameters<typeof ChannelService>;
    const service = new ChannelService(
      prisma as unknown as Dependencies[0],
      publisher as unknown as Dependencies[1],
      s3 as unknown as Dependencies[2],
      profiles as unknown as Dependencies[3],
      { emit: jest.fn() } as unknown as Dependencies[4],
      {} as Dependencies[5],
    );
    return { service, prisma, publisher };
  }

  it.each(['space-owner', 'space-admin', 'creator'])(
    'does not grant private management privileges to %s',
    async (actorId) => {
      const { service, prisma } = fixture(actorId);
      await expect(
        service.updateChannelSettings('private', actorId, {
          allowSendMessage: false,
        }),
      ).rejects.toThrow();
      await expect(
        service.updateChannelInfo('private', actorId, { name: 'renamed' }),
      ).rejects.toThrow();
      await expect(
        service.disbandChannel('private', actorId),
      ).rejects.toThrow();
      expect(prisma.channelSetting.update).not.toHaveBeenCalled();
      expect(prisma.channel.update).not.toHaveBeenCalled();
      expect(prisma.channel.delete).not.toHaveBeenCalled();
    },
  );

  it('lets the successor owner manage settings and rename the private channel', async () => {
    const { service, prisma } = fixture('successor', SpaceRole.MEMBER);
    await service.updateChannelSettings('private', 'successor', {
      allowSendMessage: false,
    });
    await service.updateChannelInfo('private', 'successor', {
      name: 'renamed',
    });
    expect(prisma.channelSetting.update).toHaveBeenCalled();
    expect(prisma.channel.update).toHaveBeenCalledWith({
      where: { id: 'private' },
      data: { name: 'renamed' },
    });
  });

  it('allows only the private owner to delete and scopes deletion events to channel members', async () => {
    const { service, prisma, publisher } = fixture(
      'successor',
      SpaceRole.MEMBER,
    );
    await service.disbandChannel('private', 'successor');
    expect(prisma.channel.delete).toHaveBeenCalledWith({
      where: { id: 'private' },
    });
    expect(publisher.publishConversationDisbanded).toHaveBeenCalledWith(
      ['private', 'successor', 'member'],
      expect.objectContaining({
        affectedUserIds: ['successor', 'member'],
        leftSpace: false,
      }),
    );
  });
});
