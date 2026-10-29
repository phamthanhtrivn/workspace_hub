import { ChannelVisibility, SpaceRole } from '@prisma/client';
import { SpaceService } from './space.service';

describe('Project space membership synchronization', () => {
  it('removes departed project members from the space and every channel atomically, then notifies clients', async () => {
    const projectSpaceId = 'space-1';
    const projectId = 'project-1';
    const ownerId = 'owner-1';
    const memberId = 'removed-member';
    const successorId = 'private-successor';
    const channelIds = ['general-channel', 'task-channel'];
    const tx = {
      $queryRaw: jest.fn(),
      userProfileSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
      message: { create: jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ id: 'system-message', ...data })) },
      space: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Project Alpha' }),
        findFirst: jest.fn().mockResolvedValue({
          id: projectSpaceId,
          name: 'Project Alpha',
          createdBy: ownerId,
        }),
      },
      channel: {
        findFirst: jest.fn().mockResolvedValue({ id: channelIds[0] }),
        findMany: jest.fn().mockImplementation(({ where }: { where: { visibility?: string } }) => where.visibility === ChannelVisibility.PRIVATE ? [
          { id: 'private-kept', name: 'Private planning', spaceId: projectSpaceId, visibility: ChannelVisibility.PRIVATE, ownerId: memberId, members: [{ userId: memberId }, { userId: successorId }] },
          { id: 'private-empty', name: 'Empty private', spaceId: projectSpaceId, visibility: ChannelVisibility.PRIVATE, ownerId: memberId, members: [{ userId: memberId }] },
        ] : [...channelIds, 'private-kept', 'private-empty'].map(id => ({ id }))),
        update: jest.fn(),
        delete: jest.fn(),
      },
      spaceMember: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ userId: ownerId }, { userId: memberId }]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      channelMember: {
        findMany: jest.fn().mockResolvedValue([{ userId: ownerId }]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    let committed = false;
    const prisma = {
      $transaction: jest.fn(
        async (operation: (transaction: typeof tx) => Promise<unknown>) => {
          const result = await operation(tx);
          committed = true;
          return result;
        },
      ),
      spaceMember: {
        findMany: jest.fn().mockResolvedValue([{ userId: ownerId }]),
      },
    };
    const publisher = {
      removeUserFromChannel: jest.fn(() => expect(committed).toBe(true)),
      publishToRooms: jest.fn(() => expect(committed).toBe(true)),
      publishMemberKicked: jest.fn(() => {
        expect(committed).toBe(true);
      }),
    };
    type Dependencies = ConstructorParameters<typeof SpaceService>;
    const kafka = { emit: jest.fn(() => expect(committed).toBe(true)) };
    const service = new SpaceService(
      prisma as unknown as Dependencies[0],
      kafka as unknown as Dependencies[1],
      publisher as unknown as Dependencies[2],
      {} as Dependencies[3],
      {} as Dependencies[4],
      {} as never,
    );

    await service.ensureProjectSpace({
      projectId,
      name: 'Project Alpha',
      ownerId,
      members: [{ userId: ownerId, role: SpaceRole.ADMIN }],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.channelMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: { in: [memberId] }, channelId: { in: [...channelIds, 'private-kept', 'private-empty'] } },
    });
    expect(tx.spaceMember.deleteMany).toHaveBeenCalledWith({
      where: { spaceId: projectSpaceId, userId: { in: [memberId] } },
    });
    expect(publisher.publishMemberKicked).toHaveBeenCalledWith(
      expect.arrayContaining([memberId, ownerId, ...channelIds]),
      expect.objectContaining({
        spaceId: projectSpaceId,
        channelIds: [channelIds[0]],
        userId: memberId,
        affectedUserIds: [memberId],
        leftSpace: true,
      }),
    );
    expect(tx.channel.update).toHaveBeenCalledWith({ where: { id: 'private-kept' }, data: { ownerId: successorId } });
    expect(tx.channel.delete).toHaveBeenCalledWith({ where: { id: 'private-empty' } });
    expect(kafka.emit).toHaveBeenCalledTimes(1);
    const ownerNotifications: unknown = kafka.emit.mock.calls;
    expect(ownerNotifications).toMatchObject([['notification-topic', { key: successorId, value: { type: 'CHANNEL_OWNERSHIP_TRANSFERRED', metadata: { channelId: 'private-kept', channelName: 'Private planning', previousOwnerId: memberId, newOwnerId: successorId } } }]]);
    expect(tx.message.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      channelId: 'private-kept', content: 'removed-member was removed from the channel because they are no longer a project member',
    }) });
    expect(tx.message.create).not.toHaveBeenCalledWith({ data: expect.objectContaining({ channelId: 'private-empty' }) });
    expect(publisher.publishToRooms).toHaveBeenCalledWith([successorId], 'new_message', expect.objectContaining({ channelId: 'private-kept', type: 'SYSTEM' }));
    expect(publisher.removeUserFromChannel).toHaveBeenCalledWith(memberId, 'private-kept');
    expect(publisher.publishMemberKicked).toHaveBeenCalledWith([memberId, successorId], expect.objectContaining({ channelId: 'private-kept', leftSpace: false }));
    for (const [, payload] of publisher.publishMemberKicked.mock.calls as unknown as [string[], { leftSpace?: boolean; channelIds?: string[] }][]) {
      if (payload.leftSpace) expect(payload.channelIds).not.toEqual(expect.arrayContaining(['private-kept', 'private-empty']));
    }

  });
});
