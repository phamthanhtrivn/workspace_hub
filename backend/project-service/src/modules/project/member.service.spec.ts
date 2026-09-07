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
  const requireOwner = jest.fn();
  const findUnique = jest.fn();
  const update = jest.fn();
  const service = new MemberService(
    {
      projectMember: { findUnique, update },
    } as unknown as PrismaService,
    { requireOwner } as unknown as ProjectAccessService,
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
    requireOwner.mockResolvedValue(undefined);
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

    expect(requireOwner).toHaveBeenCalledWith(ownerId, projectId);
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
});
