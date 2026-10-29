import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { PROJECT_DATE_MESSAGES } from './project.constants';
import {
  ProjectMemberStatus,
  ProjectRole,
  ProjectStatus,
} from './project.enums';

describe('ProjectService creation dates', () => {
  type Dependencies = ConstructorParameters<typeof ProjectService>;
  const ownerId = '22222222-2222-4222-8222-222222222222';

  function createService() {
    const createProject = jest.fn().mockImplementation(async ({ data }) => data);
    const transaction = jest.fn(async (operation) =>
      operation({ project: { create: createProject }, projectAccessSyncJob: { upsert: jest.fn() } }),
    );
    const ensureProjectRootFolder = jest.fn().mockResolvedValue(undefined);
    const service = new ProjectService(
      { $transaction: transaction } as unknown as Dependencies[0],
      {} as Dependencies[1],
      { getProfileByUserId: jest.fn().mockResolvedValue(null) } as unknown as Dependencies[2],
      { ensureProjectRootFolder } as unknown as Dependencies[3],
      {} as Dependencies[4],
      {} as Dependencies[5],
    );
    return { service, transaction, createProject, ensureProjectRootFolder };
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T05:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    {
      label: 'a past start date',
      dates: { startDate: '2026-10-21' },
      error: new BadRequestException(PROJECT_DATE_MESSAGES.startDateInPast),
    },
    {
      label: 'an end date without a start date',
      dates: { dueDate: '2026-10-23' },
      error: new BadRequestException(PROJECT_DATE_MESSAGES.startDateRequiredForEndDate),
    },
    {
      label: 'an end date with a null start date',
      dates: { startDate: null, dueDate: '2026-10-23' },
      error: new BadRequestException(PROJECT_DATE_MESSAGES.startDateRequiredForEndDate),
    },
    {
      label: 'an end date before the start date',
      dates: { startDate: '2026-10-24', dueDate: '2026-10-23' },
      error: new ConflictException(PROJECT_DATE_MESSAGES.invalidDateRange),
    },
  ])('rejects $label before writing', async ({ dates, error }) => {
    const { service, transaction, ensureProjectRootFolder } = createService();

    await expect(service.create(ownerId, { name: 'Project Alpha', ...dates }))
      .rejects.toThrow(error);
    expect(transaction).not.toHaveBeenCalled();
    expect(ensureProjectRootFolder).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'omitted dates', dates: {} },
    { label: 'null dates', dates: { startDate: null, dueDate: null } },
    { label: 'today without an end date', dates: { startDate: '2026-10-22' } },
    { label: 'equal dates', dates: { startDate: '2026-10-22', dueDate: '2026-10-22' } },
    { label: 'future dates', dates: { startDate: '2026-10-23', dueDate: '2026-10-24' } },
  ])('creates a project with $label', async ({ dates }) => {
    const { service, transaction, createProject, ensureProjectRootFolder } = createService();

    await expect(service.create(ownerId, { name: 'Project Alpha', ...dates }))
      .resolves.toMatchObject({ name: 'Project Alpha', ownerId });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(createProject).toHaveBeenCalledTimes(1);
    expect(ensureProjectRootFolder).not.toHaveBeenCalled();
  });
});

describe('ProjectService project space access sync', () => {
  const projectId = '11111111-1111-4111-8111-111111111111';
  const ownerId = '22222222-2222-4222-8222-222222222222';
  const projectAdminId = '33333333-3333-4333-8333-333333333333';
  const memberId = '44444444-4444-4444-8444-444444444444';

  it('maps project owner/admin to space admin and members to space member', async () => {
    const prisma = {
      projectAccessSyncJob: { findUnique: jest.fn().mockResolvedValue(null) },
      projectMember: {
        findMany: jest.fn().mockResolvedValue([
          { userId: ownerId, role: ProjectRole.ADMIN },
          { userId: projectAdminId, role: ProjectRole.ADMIN },
          { userId: memberId, role: ProjectRole.MEMBER },
        ]),
      },
    } as any;
    const projectSpaces = {
      getProjectSpaceStatus: jest.fn().mockResolvedValue({
        projectId,
        exists: true,
        spaceId: 'space-id',
        channelId: 'channel-id',
      }),
      ensureProjectSpace: jest.fn().mockResolvedValue({
        projectId,
        spaceId: 'space-id',
        channelId: 'channel-id',
      }),
    };
    const service = new ProjectService(
      prisma,
      { findProject: jest.fn() } as any,
      {} as any,
      {} as any,
      projectSpaces as any,
      {} as any,
    );

    await service.syncProjectSpaceAccess(projectId, {
      id: projectId,
      name: 'Project Alpha',
      ownerId,
      status: ProjectStatus.ACTIVE,
      archived: false,
      setting: null,
    } as any);

    expect(prisma.projectMember.findMany).toHaveBeenCalledWith({
      where: { projectId, status: ProjectMemberStatus.ACTIVE },
      select: {
        userId: true,
        role: true,
      },
      orderBy: { joinedAt: 'asc' },
    });
    expect(projectSpaces.ensureProjectSpace).toHaveBeenCalledWith({
      projectId,
      name: 'Project Alpha',
      ownerId,
      members: [
        { userId: ownerId, role: 'ADMIN' },
        { userId: projectAdminId, role: 'ADMIN' },
        { userId: memberId, role: 'MEMBER' },
      ],
    });
  });

  it('publishes a project space realtime event when opening project space', async () => {
    const project = {
      id: projectId,
      name: 'Project Alpha',
      ownerId,
      status: ProjectStatus.ACTIVE,
      archived: false,
      setting: null,
    };
    const prisma = {
      projectAccessSyncJob: { upsert: jest.fn(), findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(operation => operation({ projectAccessSyncJob: { upsert: jest.fn() } })),
      projectMember: {
        findMany: jest.fn().mockResolvedValue([
          { userId: ownerId, role: ProjectRole.ADMIN },
          { userId: memberId, role: ProjectRole.MEMBER },
        ]),
      },
    } as any;
    const access = {
      requireReadAccess: jest.fn().mockResolvedValue(project),
      getActiveMember: jest.fn(),
    };
    const projectSpaces = {
      getProjectSpaceStatus: jest.fn().mockResolvedValue({
        projectId,
        exists: false,
        spaceId: null,
        channelId: null,
      }),
      ensureProjectSpace: jest.fn().mockResolvedValue({
        projectId,
        spaceId: 'space-id',
        channelId: 'channel-id',
      }),
    };
    const socketPublisher = {
      publish: jest.fn(),
    };
    const service = new ProjectService(
      prisma,
      access as any,
      {} as any,
      {} as any,
      projectSpaces as any,
      socketPublisher as any,
    );

    await expect(
      service.openProjectSpace(ownerId, projectId),
    ).resolves.toEqual({
      projectId,
      spaceId: 'space-id',
      channelId: 'channel-id',
    });

    expect(socketPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        resource: 'PROJECT_SPACE',
        action: 'CREATED',
        actorId: ownerId,
        entityId: 'space-id',
        data: {
          exists: true,
          spaceId: 'space-id',
          channelId: 'channel-id',
        },
      }),
    );
  });

  it('publishes a project space realtime event for internal project space delete', async () => {
    const access = {
      findProject: jest.fn().mockResolvedValue({
        id: projectId,
        name: 'Project Alpha',
        ownerId,
      }),
    };
    const socketPublisher = {
      publish: jest.fn(),
    };
    const service = new ProjectService(
      {} as any,
      access as any,
      {} as any,
      {} as any,
      {} as any,
      socketPublisher as any,
    );

    await expect(
      service.publishProjectSpaceEvent(projectId, {
        action: 'DELETED',
        actorId: ownerId,
        entityId: '55555555-5555-4555-8555-555555555555',
        spaceId: '55555555-5555-4555-8555-555555555555',
        channelId: null,
        exists: false,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        projectId,
        resource: 'PROJECT_SPACE',
        action: 'DELETED',
        actorId: ownerId,
        entityId: '55555555-5555-4555-8555-555555555555',
        data: {
          exists: false,
          spaceId: '55555555-5555-4555-8555-555555555555',
          channelId: null,
        },
      }),
    );
    expect(socketPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId,
        resource: 'PROJECT_SPACE',
        action: 'DELETED',
        actorId: ownerId,
        entityId: '55555555-5555-4555-8555-555555555555',
        data: {
          exists: false,
          spaceId: '55555555-5555-4555-8555-555555555555',
          channelId: null,
        },
      }),
    );
  });
});
