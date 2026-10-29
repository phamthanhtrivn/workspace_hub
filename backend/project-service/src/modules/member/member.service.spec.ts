import { ConflictException, ForbiddenException } from "@nestjs/common";
import { MemberService } from "./member.service";
import { ProjectMemberStatus, ProjectRole } from "../project/project.enums";

describe("MemberService project access removal", () => {
  const projectId = "project-1";
  const memberUserId = "member-1";
  const ownerId = "owner-1";

  it.each([0, 1])('queues access for both a new and a reactivated membership (reactivated=%s)', async reactivated => {
    const member = { id: 'membership', projectId, userId: memberUserId, role: ProjectRole.MEMBER, status: ProjectMemberStatus.ACTIVE, joinedAt: new Date() };
    const tx = { projectMember: {
      updateMany: jest.fn().mockResolvedValue({ count: reactivated }), findUniqueOrThrow: jest.fn().mockResolvedValue(member), create: jest.fn().mockResolvedValue(member),
    }, projectAccessSyncJob: { upsert: jest.fn() } };
    const service = new MemberService({ $transaction: (operation: (client: typeof tx) => Promise<unknown>) => operation(tx) } as any,
      { requireOwnerWriteAccess: jest.fn().mockResolvedValue({ setting: null }) } as any,
      { getProfileByUserId: jest.fn().mockResolvedValue(null) } as any, {} as any);
    await service.add(ownerId, projectId, { userId: memberUserId });
    expect(tx.projectAccessSyncJob.upsert).toHaveBeenCalledTimes(1);
  });

  function createService() {
    let committed = false;
    const projectMember = {
      findUnique: jest.fn().mockResolvedValue({
        id: "membership-1",
        userId: memberUserId,
        role: ProjectRole.MEMBER,
        status: ProjectMemberStatus.ACTIVE,
        version: 3,
      }),
      update: jest.fn().mockResolvedValue({}),
    };
    const projectAccessSyncJob = { upsert: jest.fn().mockResolvedValue({}) };
    const prisma = {
      $transaction: jest.fn(async (operation) => {
        const result = await operation({ projectMember, projectAccessSyncJob });
        committed = true;
        return result;
      }),
    };
    const access = { requireCanManageMembers: jest.fn().mockResolvedValue({}) };
    const projects = {
      syncProjectDocumentAccess: jest.fn(async () => {
        expect(committed).toBe(true);
      }),
      syncProjectSpaceAccess: jest.fn(async () => {
        expect(committed).toBe(true);
      }),
    };
    type Dependencies = ConstructorParameters<typeof MemberService>;
    const service = new MemberService(
      prisma as unknown as Dependencies[0],
      access as unknown as Dependencies[1],
      {} as Dependencies[2],
      projects as unknown as Dependencies[3],
    );
    return { service, projectMember, access, projects, projectAccessSyncJob };
  }

  it("atomically queues revocation with project removal", async () => {
    const { service, projectMember, projects, projectAccessSyncJob } = createService();
    await service.remove(ownerId, projectId, memberUserId);
    expect(projectMember.update).toHaveBeenCalledWith({
      where: { id: "membership-1", version: 3 },
      data: expect.objectContaining({
        status: ProjectMemberStatus.LEFT,
        leftAt: expect.any(Date),
      }),
    });
    expect(projects.syncProjectDocumentAccess).not.toHaveBeenCalled();
    expect(projectAccessSyncJob.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { projectId } }));
    expect(projects.syncProjectSpaceAccess).not.toHaveBeenCalled();
  });

  it("commits membership while dependent services are unavailable", async () => {
    const { service, projects, projectAccessSyncJob } = createService();
    const failure = new Error("Document service unavailable");
    projects.syncProjectDocumentAccess.mockRejectedValueOnce(failure);
    await expect(
      service.remove(ownerId, projectId, memberUserId),
    ).resolves.toBeUndefined();
    expect(projects.syncProjectSpaceAccess).not.toHaveBeenCalled();
    expect(projectAccessSyncJob.upsert).toHaveBeenCalled();
  });

  it("fails the transaction when durable synchronization cannot be queued", async () => {
    const { service, projects, projectAccessSyncJob } = createService();
    const failure = new Error("Space service unavailable");
    projectAccessSyncJob.upsert.mockRejectedValueOnce(failure);
    await expect(
      service.remove(ownerId, projectId, memberUserId),
    ).rejects.toThrow(failure);
  });

  it("does not remove access when the requester cannot manage project members", async () => {
    const { service, access, projectMember, projects } = createService();
    access.requireCanManageMembers.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    await expect(
      service.remove("unauthorized", projectId, memberUserId),
    ).rejects.toThrow(ForbiddenException);
    expect(projectMember.update).not.toHaveBeenCalled();
    expect(projects.syncProjectDocumentAccess).not.toHaveBeenCalled();
    expect(projects.syncProjectSpaceAccess).not.toHaveBeenCalled();
  });

  it("does not allow removing the project owner", async () => {
    const { service, projectMember, projects } = createService();
    projectMember.findUnique.mockResolvedValueOnce({
      id: "membership-1",
      userId: ownerId,
      role: ProjectRole.ADMIN,
      status: ProjectMemberStatus.ACTIVE,
      version: 3,
    });
    await expect(service.remove(ownerId, projectId, ownerId)).rejects.toThrow(
      ConflictException,
    );
    expect(projectMember.update).not.toHaveBeenCalled();
    expect(projects.syncProjectSpaceAccess).not.toHaveBeenCalled();
  });
});
