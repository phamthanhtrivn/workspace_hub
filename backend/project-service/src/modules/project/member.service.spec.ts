import { ConflictException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MemberService } from "./member.service";
import { ProjectAccessService } from "./project-access.service";
import { ProjectMemberStatus, ProjectRole } from "./project.enums";
import { TaskCalendarEventService } from "./task-calendar-event.service";

describe("MemberService.updatePermissions", () => {
  const projectId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const memberUserId = crypto.randomUUID();
  const requireOwnerWriteAccess = jest.fn();
  const findUnique = jest.fn();
  const update = jest.fn();
  const service = new MemberService(
    {
      projectMember: { findUnique, update },
    } as unknown as PrismaService,
    { requireOwnerWriteAccess } as unknown as ProjectAccessService,
    { publishProject: jest.fn() } as unknown as TaskCalendarEventService,
  );
  const permissions = {
    canCreateTask: true,
    canEditOwnTask: true,
    canEditOthersTask: false,
    canManageSprints: true,
    canManageMembers: false,
    canManageLabels: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    requireOwnerWriteAccess.mockResolvedValue(undefined);
    findUnique.mockResolvedValue({
      id: crypto.randomUUID(),
      projectId,
      userId: memberUserId,
      role: ProjectRole.MEMBER,
      status: ProjectMemberStatus.ACTIVE,
      version: 2,
      joinedAt: new Date(),
      leftAt: null,
      updatedAt: new Date(),
      ...permissions,
    });
    update.mockImplementation(({ data }) =>
      Promise.resolve({
        ...findUnique.mock.results[0]?.value,
        id: crypto.randomUUID(),
        projectId,
        userId: memberUserId,
        role: ProjectRole.MEMBER,
        status: ProjectMemberStatus.ACTIVE,
        joinedAt: new Date(),
        leftAt: null,
        updatedAt: data.updatedAt,
        ...permissions,
      }),
    );
  });

  it("allows only the project owner to update member permissions", async () => {
    await service.updatePermissions(
      ownerId,
      projectId,
      memberUserId,
      permissions,
    );

    expect(requireOwnerWriteAccess).toHaveBeenCalledWith(ownerId, projectId);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining(permissions) }),
    );
  });

  it("does not allow changing owner permissions", async () => {
    findUnique.mockResolvedValue({
      role: ProjectRole.OWNER,
      status: ProjectMemberStatus.ACTIVE,
    });

    await expect(
      service.updatePermissions(ownerId, projectId, ownerId, permissions),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it('allows only the owner to add a member and applies project task defaults', async () => {
    const create = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({ ...data, version: 0n, leftAt: null }),
    );
    const tx = {
      projectMember: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create,
      },
    };
    const project = {
      id: projectId,
      ownerId,
      archived: false,
      status: 'ACTIVE',
      setting: {
        allowMemberCreateTask: true,
        allowMemberEditOwnTask: true,
        allowMemberEditOthersTask: false,
      },
    };
    const ownerWrite = jest.fn().mockResolvedValue(project);
    const localService = new MemberService(
      {
        $transaction: jest.fn(async (callback) => callback(tx)),
      } as unknown as PrismaService,
      { requireOwnerWriteAccess: ownerWrite } as unknown as ProjectAccessService,
      { publishProject: jest.fn() } as unknown as TaskCalendarEventService,
    );

    await localService.add(ownerId, projectId, { userId: memberUserId });

    expect(ownerWrite).toHaveBeenCalledWith(ownerId, projectId);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        canCreateTask: true,
        canEditOwnTask: true,
        canEditOthersTask: false,
        canManageSprints: false,
        canManageMembers: false,
        canManageLabels: false,
      }),
    });
  });
});
