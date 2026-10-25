import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChannelVisibility, MessageType, Prisma } from '@prisma/client';
import {
  PrivateChannelService,
  reconcilePrivateMemberships,
  publishPrivateMembershipChanges,
} from './private-channel.service';
import { PrivateChannelMembershipAction } from './types/private-channel-system-message.types';

describe('Private channel membership', () => {
  const channel = {
    id: 'channel',
    name: 'planning',
    spaceId: 'space',
    visibility: ChannelVisibility.PRIVATE,
    ownerId: 'owner',
  };
  function fixture() {
    const tx = {
      space: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Project space' }),
      },
      userProfileSnapshot: {
        findMany: jest.fn().mockResolvedValue([
          { userId: 'owner', fullName: 'Owner name' },
          { userId: 'member', fullName: 'Member name' },
          { userId: 'earliest', fullName: 'First member' },
        ]),
      },
      message: {
        create: jest
          .fn()
          .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
            Promise.resolve({ id: 'system-message', ...data }),
          ),
      },
      channel: {
        findUnique: jest.fn().mockResolvedValue(channel),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      channelMember: {
        findUnique: jest.fn().mockResolvedValue({ id: 'membership' }),
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn(),
        delete: jest.fn(),
      },
      spaceMember: {
        findUnique: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    let committed = false;
    const prisma = {
      ...tx,
      space: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Project space' }),
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
      removeUserFromChannel: jest.fn(() => expect(committed).toBe(true)),
      publishMemberKicked: jest.fn(),
      publishMemberLeft: jest.fn(),
      publishToRooms: jest.fn(() => expect(committed).toBe(true)),
    };
    const profiles = {
      getProfilesByUserIds: jest
        .fn()
        .mockResolvedValue(new Map([['owner', { fullName: 'Owner name' }]])),
    };
    const kafka = { emit: jest.fn(() => expect(committed).toBe(true)) };
    type Dependencies = ConstructorParameters<typeof PrivateChannelService>;
    const service = new PrivateChannelService(
      prisma as unknown as Dependencies[0],
      publisher as unknown as Dependencies[1],
      profiles as unknown as Dependencies[2],
      kafka as unknown as Dependencies[3],
    );
    return { service, tx, prisma, publisher, kafka };
  }

  it('denies member management to everyone except the channel owner', async () => {
    const { service, tx } = fixture();
    await expect(
      service.addMembers('channel', 'space-admin', ['member']),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.removeMember('channel', 'space-admin', 'member'),
    ).rejects.toThrow(ForbiddenException);
    expect(tx.channelMember.createMany).not.toHaveBeenCalled();
    expect(tx.channelMember.delete).not.toHaveBeenCalled();
  });

  it('rejects a user outside the space without adding anyone', async () => {
    const { service, tx, kafka } = fixture();
    tx.spaceMember.count.mockResolvedValue(0);
    await expect(
      service.addMembers('channel', 'owner', ['outsider']),
    ).rejects.toThrow(BadRequestException);
    expect(tx.channelMember.createMany).not.toHaveBeenCalled();
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('adds directly and sends only new members a detailed notification after commit', async () => {
    const { service, tx, kafka, prisma } = fixture();
    await service.addMembers('channel', 'owner', ['member', 'member']);
    expect(tx.channelMember.createMany).toHaveBeenCalledWith({
      data: [{ channelId: 'channel', userId: 'member' }],
      skipDuplicates: true,
    });
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(kafka.emit).toHaveBeenCalledTimes(1);
    expect(kafka.emit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        key: 'member',
        value: expect.objectContaining({
          recipientId: 'member',
          type: 'CHANNEL_MEMBER_ADDED',
          metadata: expect.objectContaining({
            channelId: 'channel',
            channelName: 'planning',
            spaceId: 'space',
            spaceName: 'Project space',
          }) as unknown,
        }) as unknown,
      }),
    );
  });

  it('does not notify existing members again', async () => {
    const { service, tx, kafka } = fixture();
    tx.channelMember.findMany.mockResolvedValue([{ userId: 'member' }]);
    await service.addMembers('channel', 'owner', ['member']);
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('emits membership refresh events to the owner and the new member after commit', async () => {
    const { service, tx, publisher } = fixture();
    tx.channelMember.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ userId: 'owner' }, { userId: 'member' }]);
    await service.addMembers('channel', 'owner', ['member']);
    expect(publisher.publishToRooms).toHaveBeenCalledWith(
      ['owner', 'member'],
      'channel_setting_updated',
      expect.objectContaining({
        eventType: 'channel_members_changed',
        channelId: 'channel',
        spaceId: 'space',
      }),
    );
  });

  it('transfers ownership to the earliest remaining member when the owner leaves', async () => {
    const { service, tx, publisher } = fixture();
    tx.channelMember.findMany.mockResolvedValue([
      { userId: 'earliest' },
      { userId: 'newer' },
    ]);
    await service.removeMember('channel', 'owner', 'owner', true);
    expect(tx.channelMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(tx.channel.update).toHaveBeenCalledWith({
      where: { id: 'channel' },
      data: { ownerId: 'earliest' },
    });
    expect(tx.channel.delete).not.toHaveBeenCalled();
    expect(publisher.removeUserFromChannel).toHaveBeenCalledWith(
      'owner',
      'channel',
    );
    expect(publisher.publishMemberLeft).toHaveBeenCalledWith(
      ['owner', 'earliest', 'newer'],
      expect.objectContaining({ leftSpace: false }),
    );
  });

  it('deletes the channel and cascading history when its last member leaves', async () => {
    const { service, tx, publisher, kafka } = fixture();
    await service.removeMember('channel', 'owner', 'owner', true);
    expect(tx.channel.delete).toHaveBeenCalledWith({
      where: { id: 'channel' },
    });
    expect(tx.channel.update).not.toHaveBeenCalled();
    expect(publisher.publishToRooms).not.toHaveBeenCalled();
    expect(tx.message.create).not.toHaveBeenCalled();
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('persists one system message for each new member and emits only to channel members after commit', async () => {
    const { service, tx, publisher } = fixture();
    tx.channelMember.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ userId: 'owner' }, { userId: 'member' }]);
    await service.addMembers('channel', 'owner', ['member', 'member']);
    expect(tx.message.create).toHaveBeenCalledTimes(1);
    expect(tx.message.create).toHaveBeenCalledWith({
      data: {
        channelId: 'channel',
        senderId: 'owner',
        type: MessageType.SYSTEM,
        content: 'Owner name added Member name to the channel',
      },
    });
    expect(publisher.publishToRooms).toHaveBeenCalledWith(
      ['owner', 'member'],
      'new_message',
      expect.objectContaining({
        id: 'system-message',
        type: MessageType.SYSTEM,
        channelId: 'channel',
      }),
    );
  });

  it('does not create a system message or notification when adding an existing member', async () => {
    const { service, tx, publisher, kafka } = fixture();
    tx.channelMember.findMany.mockResolvedValue([{ userId: 'member' }]);
    await service.addMembers('channel', 'owner', ['member']);
    expect(tx.message.create).not.toHaveBeenCalled();
    expect(publisher.publishToRooms).not.toHaveBeenCalled();
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it.each([
    {
      actorId: 'member',
      leaving: true,
      content: 'Member name left the channel',
    },
    {
      actorId: 'owner',
      leaving: false,
      content: 'Owner name removed Member name from the channel',
    },
  ])(
    'records removal with leaving=$leaving and excludes the departed user from new messages',
    async ({ actorId, leaving, content }) => {
      const { service, tx, publisher } = fixture();
      tx.channelMember.findMany.mockResolvedValue([{ userId: 'owner' }]);
      await service.removeMember('channel', actorId, 'member', leaving);
      expect(tx.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content,
          type: MessageType.SYSTEM,
        }) as unknown,
      });
      expect(publisher.publishToRooms).toHaveBeenCalledWith(
        ['owner'],
        'new_message',
        expect.objectContaining({ content }),
      );
    },
  );

  it('records owner succession after the owner leaves', async () => {
    const { service, tx, kafka } = fixture();
    tx.channelMember.findMany.mockResolvedValue([{ userId: 'earliest' }]);
    await service.removeMember('channel', 'owner', 'owner', true);
    expect(
      (
        tx.message.create.mock.calls as unknown as [
          { data: { content: string } },
        ][]
      ).map(([argument]) => argument.data.content),
    ).toEqual([
      'Owner name left the channel',
      'First member is now the channel owner',
    ]);
    expect(kafka.emit).toHaveBeenCalledTimes(1);
    const deliveries: unknown = kafka.emit.mock.calls;
    expect(deliveries).toEqual([
      [
        'notification-topic',
        {
          key: 'earliest',
          value: {
            recipientId: 'earliest',
            senderId: 'owner',
            senderName: 'Owner name',
            senderAvatar: undefined,
            type: 'CHANNEL_OWNERSHIP_TRANSFERRED',
            title: 'You are now a private channel owner',
            content:
              'You are now the owner of planning in Project space because Owner name is no longer in the channel. You can manage its members and settings.',
            link: '/chat?spaceId=space&channelId=channel',
            metadata: {
              channelId: 'channel',
              channelName: 'planning',
              spaceId: 'space',
              spaceName: 'Project space',
              previousOwnerId: 'owner',
              newOwnerId: 'earliest',
              visibility: ChannelVisibility.PRIVATE,
            },
          },
        },
      ],
    ]);
  });

  it('does not notify a successor if owner transfer fails', async () => {
    const { service, tx, publisher, kafka } = fixture();
    tx.channelMember.findMany.mockResolvedValue([{ userId: 'earliest' }]);
    tx.channel.update.mockRejectedValue(new Error('transfer failed'));
    await expect(
      service.removeMember('channel', 'owner', 'owner', true),
    ).rejects.toThrow('transfer failed');
    expect(kafka.emit).not.toHaveBeenCalled();
    expect(publisher.publishMemberLeft).not.toHaveBeenCalled();
  });

  it('notifies only a remaining successor after a bulk project removal commits', async () => {
    const { tx, prisma, publisher, kafka } = fixture();
    tx.channel.findMany.mockResolvedValue([
      {
        ...channel,
        members: [
          { userId: 'owner' },
          { userId: 'removed-first' },
          { userId: 'earliest' },
        ],
      },
      { ...channel, id: 'empty', members: [{ userId: 'owner' }] },
    ]);
    const changes = await prisma.$transaction((client) =>
      reconcilePrivateMemberships(
        client as unknown as Prisma.TransactionClient,
        'space',
        ['owner', 'removed-first'],
      ),
    );
    publishPrivateMembershipChanges(
      publisher as unknown as ConstructorParameters<
        typeof PrivateChannelService
      >[1],
      changes as Awaited<ReturnType<typeof reconcilePrivateMemberships>>,
      kafka as unknown as ConstructorParameters<
        typeof PrivateChannelService
      >[3],
    );
    expect(kafka.emit).toHaveBeenCalledTimes(1);
    const deliveries: unknown = kafka.emit.mock.calls;
    expect(deliveries).toMatchObject([
      [
        'notification-topic',
        {
          key: 'earliest',
          value: {
            type: 'CHANNEL_OWNERSHIP_TRANSFERRED',
            metadata: { channelId: 'channel', newOwnerId: 'earliest' },
          },
        },
      ],
    ]);
  });

  it('notifies only the removed member after commit, with channel/space details and no inaccessible channel link', async () => {
    const { service, tx, kafka } = fixture();
    tx.channelMember.findMany.mockResolvedValue([{ userId: 'owner' }]);
    await service.removeMember('channel', 'owner', 'member');
    const notifications: unknown = kafka.emit.mock.calls;
    expect(notifications).toEqual([
      [
        'notification-topic',
        {
          key: 'member',
          value: {
            recipientId: 'member',
            senderId: 'owner',
            senderName: 'Owner name',
            senderAvatar: undefined,
            type: 'CHANNEL_MEMBER_REMOVED',
            title: 'Removed from a private channel',
            content:
              'Owner name removed you from planning in Project space. You no longer have access to this channel.',
            metadata: {
              channelId: 'channel',
              channelName: 'planning',
              spaceId: 'space',
              spaceName: 'Project space',
              actorId: 'owner',
              visibility: ChannelVisibility.PRIVATE,
            },
          },
        },
      ],
    ]);
  });

  it('does not send a removal notification when a member leaves voluntarily', async () => {
    const { service, tx, kafka } = fixture();
    tx.channelMember.findMany.mockResolvedValue([{ userId: 'owner' }]);
    await service.removeMember('channel', 'member', 'member', true);
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('does not notify a removed member if the membership transaction fails', async () => {
    const { service, tx, kafka, publisher } = fixture();
    tx.channelMember.findMany.mockResolvedValue([{ userId: 'owner' }]);
    tx.message.create.mockRejectedValue(new Error('write failed'));
    await expect(
      service.removeMember('channel', 'owner', 'member'),
    ).rejects.toThrow('write failed');
    expect(kafka.emit).not.toHaveBeenCalled();
    expect(publisher.publishMemberKicked).not.toHaveBeenCalled();
  });

  it('does not emit membership events or notifications when the system message cannot be saved', async () => {
    const { service, tx, publisher, kafka } = fixture();
    tx.message.create.mockRejectedValue(new Error('write failed'));
    await expect(
      service.addMembers('channel', 'owner', ['member']),
    ).rejects.toThrow('write failed');
    expect(publisher.publishToRooms).not.toHaveBeenCalled();
    expect(kafka.emit).not.toHaveBeenCalled();
  });

  it('does not allow kicking the owner or pretending to leave as another user', async () => {
    const { service, tx } = fixture();
    await expect(
      service.removeMember('channel', 'owner', 'owner'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.removeMember('channel', 'member', 'owner', true),
    ).rejects.toThrow(ForbiddenException);
    expect(tx.channel.delete).not.toHaveBeenCalled();
  });

  it('reconciles project removals within the caller transaction, transferring or deleting each private channel', async () => {
    const { tx } = fixture();
    tx.channel.findMany.mockResolvedValue([
      { ...channel, members: [{ userId: 'owner' }, { userId: 'successor' }] },
      { ...channel, id: 'empty', members: [{ userId: 'owner' }] },
    ]);
    const changes = await reconcilePrivateMemberships(
      tx as unknown as Prisma.TransactionClient,
      'space',
      ['owner'],
    );
    expect(tx.channel.update).toHaveBeenCalledWith({
      where: { id: 'channel' },
      data: { ownerId: 'successor' },
    });
    expect(tx.channel.delete).toHaveBeenCalledWith({ where: { id: 'empty' } });
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'channel',
          ownerId: 'successor',
          deleted: false,
        }),
        expect.objectContaining({ id: 'empty', deleted: true }),
      ]),
    );
  });

  it.each([
    {
      action: PrivateChannelMembershipAction.SPACE_LEFT,
      content: 'Member name left the channel after leaving the space',
    },
    {
      action: PrivateChannelMembershipAction.SPACE_REMOVED,
      content:
        'Member name was removed from the channel after Owner name removed them from the space',
    },
  ])(
    'records a space membership change with action=$action',
    async ({ action, content }) => {
      const { tx, publisher } = fixture();
      tx.channel.findMany.mockResolvedValue([
        { ...channel, members: [{ userId: 'owner' }, { userId: 'member' }] },
      ]);
      const changes = await reconcilePrivateMemberships(
        tx as unknown as Prisma.TransactionClient,
        'space',
        ['member'],
        { actorId: 'owner', action },
      );
      expect(tx.message.create).toHaveBeenCalledWith({
        data: {
          channelId: 'channel',
          senderId: 'owner',
          type: MessageType.SYSTEM,
          content,
        },
      });
      expect(changes[0].systemMessages).toHaveLength(1);
      expect(publisher.publishToRooms).not.toHaveBeenCalled();
    },
  );
});
