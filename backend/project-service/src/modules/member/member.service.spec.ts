import { ConflictException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MemberService } from "./member.service";
import { ProjectAccessService } from "../project/project-access.service";
import { ProjectMemberStatus, ProjectRole } from "../project/project.enums";
import { TaskCalendarEventService } from "../notification-outbox/task-calendar-event.service";
import { UserProfileSnapshotService } from "../user-profile-snapshot/user-profile-snapshot.service";

describe("MemberService.updatePermissions", () => {
  const projectId = crypto.randomUUID();
  const ownerId = crypto.randomUUID();
  const memberUserId = crypto.randomUUID();
  const requireOwnerWriteAccess = jest.fn();
  const findUnique = jest.fn();
  const update = jest.fn();
  const userProfiles = {
    getProfileByUserId: jest.fn().mockResolvedValue(null),
    getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
  } as unknown as UserProfileSnapshotService;

  const service = new MemberService(
    {
      projectMember: { findUnique, update },
    } as unknown as PrismaService,
    { requireOwnerWriteAccess } as unknown as ProjectAccessService,
    { publishProject: jest.fn() } as unknown as TaskCalendarEventService,
    userProfiles,
  );
  const permissions = {
    canCreateTask: true,
    canEditOwnTask: true,
    canEditOthersTask: false,
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
    update.mockImplementation(async ({ data }) => ({
      id: crypto.randomUUID(),
      projectId,
      userId: memberUserId,
      role: ProjectRole.MEMBER,
      status: ProjectMemberStatus.ACTIVE,
      version: 3,
      joinedAt: new Date(),
      leftAt: null,
      updatedAt: new Date(),
      ...permissions,
      ...data,
    }));
  });

  it("updates explicit project member permissions", async () => {
    const updated = await service.updatePermissions(
      ownerId,
      projectId,
      memberUserId,
      {
        canCreateTask: false,
        canEditOwnTask: true,
        canEditOthersTask: true,
        canManageMembers: true,
        canManageLabels: false,
      },
    );

    expect(requireOwnerWriteAccess).toHaveBeenCalledWith(ownerId, projectId);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: expect.any(String), version: 2 },
        data: expect.objectContaining({
          canCreateTask: false,
          canEditOthersTask: true,
          canManageMembers: true,
          version: { increment: 1 },
        }),
      }),
    );
    expect(updated).toMatchObject({
      canCreateTask: false,
      canEditOthersTask: true,
      canManageMembers: true,
    });
  });

  it("rejects permission changes for the project owner member row", async () => {
    findUnique.mockResolvedValueOnce({
      id: crypto.randomUUID(),
      projectId,
      userId: memberUserId,
      role: ProjectRole.ADMIN,
      status: ProjectMemberStatus.ACTIVE,
      version: 2,
      joinedAt: new Date(),
      leftAt: null,
      updatedAt: new Date(),
      ...permissions,
    });

    await expect(
      service.updatePermissions(ownerId, projectId, memberUserId, {
        canCreateTask: true,
        canEditOwnTask: true,
        canEditOthersTask: true,
        canManageMembers: true,
        canManageLabels: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("initializes member permissions from project settings on add", async () => {
    const create = jest.fn().mockImplementation(async ({ data }) => ({
      ...data,
      id: crypto.randomUUID(),
      version: 0n,
    }));
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
      status: "ACTIVE",
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
      userProfiles,
    );

    await localService.add(ownerId, projectId, { userId: memberUserId });

    expect(ownerWrite).toHaveBeenCalledWith(ownerId, projectId);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        canCreateTask: true,
        canEditOwnTask: true,
        canEditOthersTask: false,
        canManageMembers: false,
        canManageLabels: false,
      }),
    });
  });
});
