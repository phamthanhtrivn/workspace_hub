import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChannelVisibility, SpaceRole } from '@prisma/client';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelInfoDto } from './dto/update-channel-info.dto';
import { SpaceService } from '../space/space.service';

describe('Channel visibility and creation', () => {
  it('validates channel type and initial membership at the API boundary', async () => {
    expect(
      await validate(
        plainToInstance(CreateChannelDto, {
          name: 'planning',
          visibility: 'SECRET',
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateChannelDto, {
          name: 'planning',
          memberUserIds: ['bad-id'],
        }),
      ),
    ).not.toHaveLength(0);
    expect(
      await validate(
        plainToInstance(CreateChannelDto, {
          name: 'planning',
          visibility: ChannelVisibility.PRIVATE,
        }),
      ),
    ).toHaveLength(0);
  });

  it('does not accept visibility or owner updates through the channel info contract', async () => {
    const update = plainToInstance(UpdateChannelInfoDto, {
      name: 'planning',
      visibility: 'PUBLIC',
      ownerId: 'attacker',
    });
    await validate(update, { whitelist: true });
    expect(update).toEqual({ name: 'planning' });
  });

  function fixture() {
    const tx = {
      userProfileSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
      message: { create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'system-message', ...data })) },
      spaceMember: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          { userId: 'owner', role: SpaceRole.ADMIN },
          { userId: 'member', role: SpaceRole.MEMBER },
        ]),
      },
      channel: {
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'channel' }),
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 'channel',
            name: 'planning',
            spaceId: 'space',
            visibility: ChannelVisibility.PRIVATE,
            ownerId: 'owner',
            members: [{ userId: 'owner' }, { userId: 'member' }],
          }),
      },
      channelSetting: { create: jest.fn() },
      channelMember: { create: jest.fn(), createMany: jest.fn() },
    };
    let committed = false;
    const prisma = {
      spaceMember: {
        findUnique: jest.fn().mockResolvedValue({ role: SpaceRole.ADMIN }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ userId: 'owner' }, { userId: 'outsider' }]),
      },
      channel: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(
        async (operation: (client: typeof tx) => Promise<unknown>) => {
          const result = await operation(tx);
          committed = true;
          return result;
        },
      ),
    };
    const publisher = {
      publishToRooms: jest.fn(() => expect(committed).toBe(true)),
    };
    const privateChannels = {
      notifyAdded: jest.fn(() => expect(committed).toBe(true)),
    };
    type Dependencies = ConstructorParameters<typeof SpaceService>;
    const service = new SpaceService(
      prisma as unknown as Dependencies[0],
      {} as Dependencies[1],
      publisher as unknown as Dependencies[2],
      {} as Dependencies[3],
      {} as Dependencies[4],
      privateChannels as unknown as Dependencies[5],
    );
    return { service, prisma, tx, publisher, privateChannels };
  }

  it('creates private channels and initial memberships atomically, notifying only selected users', async () => {
    const { service, tx, publisher, privateChannels } = fixture();
    await service.createChannel('owner', 'space', 'planning', {
      visibility: ChannelVisibility.PRIVATE,
      memberUserIds: ['member'],
    });
    expect(tx.channel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        visibility: ChannelVisibility.PRIVATE,
        ownerId: 'owner',
        isDefault: false,
      }),
    });
    expect(tx.channelMember.createMany).toHaveBeenCalledWith({
      data: [{ channelId: 'channel', userId: 'member' }],
      skipDuplicates: true,
    });
    expect(tx.message.create).toHaveBeenCalledWith({ data: {
      channelId: 'channel', senderId: 'owner', type: 'SYSTEM', content: 'owner added member to the channel',
    } });
    expect(publisher.publishToRooms).toHaveBeenCalledWith(['owner', 'member'], 'new_message', expect.objectContaining({ type: 'SYSTEM' }));
    expect(publisher.publishToRooms).toHaveBeenCalledWith(
      ['owner', 'member'],
      expect.any(String),
      expect.any(Object),
    );
    expect(privateChannels.notifyAdded).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'channel' }),
      'owner',
      ['member'],
    );
  });

  it('rejects invalid initial members before creating a channel', async () => {
    const { service, tx, publisher } = fixture();
    tx.spaceMember.count.mockResolvedValue(1);
    await expect(
      service.createChannel('owner', 'space', 'planning', {
        visibility: ChannelVisibility.PRIVATE,
        memberUserIds: ['outsider'],
      }),
    ).rejects.toThrow();
    expect(tx.channel.create).not.toHaveBeenCalled();
    expect(publisher.publishToRooms).not.toHaveBeenCalled();
  });

  it('filters discovery to public channels and private channels of which the requester is a member', async () => {
    const { service, prisma } = fixture();
    await service.getSpaceChannels('space-admin', 'space');
    expect(prisma.channel.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          spaceId: 'space',
          OR: [
            { visibility: ChannelVisibility.PUBLIC },
            { members: { some: { userId: 'space-admin' } } },
          ],
        },
      }),
    );
  });
});
