import { SpaceService } from './space.service';

describe('Project space access revisions after provisioning', () => {
  function setup() {
    type ProjectSpace = {
      id: string;
      name: string;
      createdBy: string;
      projectId: string;
      accessSyncRevision: bigint;
    };
    let space: ProjectSpace | null = null;
    const tx = {
      $queryRaw: jest.fn(),
      space: {
        findFirst: jest.fn(async () => space),
        findUnique: jest.fn(async () => space),
        create: jest.fn(async ({ data }: { data: Omit<ProjectSpace, 'id'> }) => {
          space = { id: 'space-one', ...data };
          return space;
        }),
        update: jest.fn(),
      },
      spaceSetting: { create: jest.fn() },
      spaceMember: { createMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
      channel: { findFirst: jest.fn().mockResolvedValue({ id: 'general-channel' }) },
      channelMember: { createMany: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
      spaceMember: { findMany: jest.fn().mockResolvedValue([{ userId: 'owner-one' }]) },
    };
    const publisher = { publishMemberJoin: jest.fn(), publishMemberKicked: jest.fn() };
    type Dependencies = ConstructorParameters<typeof SpaceService>;
    const service = new SpaceService(
      prisma as unknown as Dependencies[0],
      {} as Dependencies[1],
      publisher as unknown as Dependencies[2],
      {} as Dependencies[3],
      {} as Dependencies[4],
      {} as Dependencies[5],
    );
    const request = {
      projectId: 'project-one',
      name: 'Current project name',
      ownerId: 'owner-one',
      members: [],
    };
    return { service, tx, publisher, request };
  }

  it.each([
    { syncRevision: '7', expectedRevision: 7n },
    { syncRevision: undefined, expectedRevision: 0n },
  ])('persists the initial access revision $expectedRevision', async ({ syncRevision, expectedRevision }) => {
    const { service, tx, request } = setup();
    await service.ensureProjectSpace({ ...request, syncRevision });
    expect(tx.space.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ accessSyncRevision: expectedRevision }),
    });
  });

  it.each(['6', undefined])('ignores a stale or unversioned snapshot (%s) after creation', async syncRevision => {
    const { service, tx, publisher, request } = setup();
    await service.ensureProjectSpace({ ...request, syncRevision: '7' });
    publisher.publishMemberJoin.mockClear();

    const result = await service.ensureProjectSpace({
      ...request,
      name: 'Outdated project name',
      ownerId: 'former-owner',
      syncRevision,
    });

    expect(result).toEqual({ projectId: request.projectId, spaceId: 'space-one', channelId: 'general-channel' });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.space.create).toHaveBeenCalledTimes(1);
    expect(tx.space.update).not.toHaveBeenCalled();
    expect(tx.spaceMember.upsert).not.toHaveBeenCalled();
    expect(tx.spaceMember.deleteMany).not.toHaveBeenCalled();
    expect(tx.channelMember.upsert).not.toHaveBeenCalled();
    expect(tx.channelMember.deleteMany).not.toHaveBeenCalled();
    expect(publisher.publishMemberJoin).not.toHaveBeenCalled();
    expect(publisher.publishMemberKicked).not.toHaveBeenCalled();
  });
});
