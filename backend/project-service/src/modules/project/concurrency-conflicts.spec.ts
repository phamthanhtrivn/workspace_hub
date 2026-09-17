import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MemberService } from "../member/member.service";
import { ProjectAccessService } from "./project-access.service";
import { TaskCalendarEventService } from "../notification-outbox/task-calendar-event.service";

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("write conflict", {
    code,
    clientVersion: "6.19.3",
  });
}

describe("Concurrent write conflicts", () => {
  const access = {
    requireCanManageMembers: jest.fn(),
    requireOwnerWriteAccess: jest.fn().mockResolvedValue({ setting: null }),
  } as unknown as ProjectAccessService;

  beforeEach(() => jest.clearAllMocks());

  it("maps a concurrent member insert to HTTP 409", async () => {
    const prisma = {
      projectMember: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockRejectedValue(prismaError("P2002")),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as unknown as PrismaService;
    prisma.$transaction = jest.fn(async (fn) => fn(prisma)) as unknown as PrismaService['$transaction'];
    const userProfiles = {
      getProfileByUserId: jest.fn().mockResolvedValue(null),
      getProfilesByUserIds: jest.fn().mockResolvedValue(new Map()),
    } as unknown as import('../user-profile-snapshot/user-profile-snapshot.service').UserProfileSnapshotService;
    const service = new MemberService(
      prisma,
      access,
      {
        publishProject: jest.fn(),
      } as unknown as TaskCalendarEventService,
      userProfiles,
    );

    await expect(
      service.add(crypto.randomUUID(), crypto.randomUUID(), {
        userId: crypto.randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
