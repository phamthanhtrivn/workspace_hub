import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  ProjectMemberStatus,
  ProjectRole,
  ProjectVisibility,
} from './project.enums';
import { ProjectAccessService } from './project-access.service';

describe('ProjectAccessService member permissions', () => {
  const ownerId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const findProject = jest.fn();
  const findMember = jest.fn();
  const service = new ProjectAccessService({
    project: { findUnique: findProject },
    projectMember: { findUnique: findMember },
  } as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    findProject.mockResolvedValue({
      id: projectId,
      ownerId,
      visibility: ProjectVisibility.MEMBERS_ONLY,
      setting: {
        allowMemberCreateTask: false,
        allowMemberEditOwnTask: false,
        allowMemberEditOthersTask: false,
        allowMemberInvite: false,
      },
    });
    findMember.mockResolvedValue({
      userId: memberId,
      role: ProjectRole.MEMBER,
      status: ProjectMemberStatus.ACTIVE,
      canCreateTask: true,
      canEditOwnTask: true,
      canEditOthersTask: true,
      canManageSprints: true,
      canManageMembers: true,
      canManageLabels: true,
    });
  });

  it('uses the member-specific permission when creating tasks', async () => {
    await expect(
      service.requireCanCreateTask(memberId, projectId),
    ).resolves.toBeDefined();
  });

  it('uses the member-specific permission when editing another member task', async () => {
    await expect(
      service.requireCanEditTask(memberId, projectId, crypto.randomUUID()),
    ).resolves.toBeDefined();
  });

  it('uses the member-specific permission when inviting members', async () => {
    await expect(
      service.requireCanInvite(memberId, projectId),
    ).resolves.toBeDefined();
  });

  it('denies a disabled member permission', async () => {
    findMember.mockResolvedValue({
      userId: memberId,
      role: ProjectRole.MEMBER,
      status: ProjectMemberStatus.ACTIVE,
      canCreateTask: false,
    });

    await expect(
      service.requireCanCreateTask(memberId, projectId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
