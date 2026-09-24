import { ProjectService } from './project.service';
import {
  ProjectMemberStatus,
  ProjectRole,
  ProjectStatus,
} from './project.enums';

describe('ProjectService project space access sync', () => {
  const projectId = '11111111-1111-4111-8111-111111111111';
  const ownerId = '22222222-2222-4222-8222-222222222222';
  const projectAdminId = '33333333-3333-4333-8333-333333333333';
  const memberId = '44444444-4444-4444-8444-444444444444';

  it('maps project owner/admin to space admin and members to space member', async () => {
    const prisma = {
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
