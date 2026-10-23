import { SpaceRole } from '@prisma/client';
import { SpaceService } from './space.service';

describe('Project space membership synchronization', () => {
  it('removes departed project members from the space and every channel atomically, then notifies clients', async () => {
    const projectSpaceId = 'space-1';
    const projectId = 'project-1';
    const ownerId = 'owner-1';
    const memberId = 'removed-member';
    const channelIds = ['general-channel', 'task-channel'];
    const tx = {
      space: {
        findFirst: jest.fn().mockResolvedValue({
          id: projectSpaceId,
          name: 'Project Alpha',
          createdBy: ownerId,
        }),
      },
      channel: {
        findFirst: jest.fn().mockResolvedValue({ id: channelIds[0] }),
        findMany: jest.fn().mockResolvedValue(channelIds.map((id) => ({ id }))),
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
      publishMemberKicked: jest.fn(() => {
        expect(committed).toBe(true);
      }),
    };
    type Dependencies = ConstructorParameters<typeof SpaceService>;
    const service = new SpaceService(
      prisma as unknown as Dependencies[0],
      {} as Dependencies[1],
      publisher as unknown as Dependencies[2],
      {} as Dependencies[3],
      {} as Dependencies[4],
    );

    await service.ensureProjectSpace({
      projectId,
      name: 'Project Alpha',
      ownerId,
      members: [{ userId: ownerId, role: SpaceRole.ADMIN }],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.channelMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: { in: [memberId] }, channelId: { in: channelIds } },
    });
    expect(tx.spaceMember.deleteMany).toHaveBeenCalledWith({
      where: { spaceId: projectSpaceId, userId: { in: [memberId] } },
    });
    expect(publisher.publishMemberKicked).toHaveBeenCalledWith(
      expect.arrayContaining([memberId, ownerId, ...channelIds]),
      expect.objectContaining({
        spaceId: projectSpaceId,
        channelIds,
        userId: memberId,
        affectedUserIds: [memberId],
        leftSpace: true,
      }),
    );
  });
});
