import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MemberService } from "./member.service";
import { ProjectAccessService } from "./project-access.service";
import { SprintStatus } from "./project.enums";
import { SprintService } from "./sprint.service";
import { TaskCalendarEventService } from "./task-calendar-event.service";

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError("write conflict", {
    code,
    clientVersion: "6.19.3",
  });
}

describe("Concurrent write conflicts", () => {
  const access = {
    requireCanManageMembers: jest.fn(),
    requireCanManageSprints: jest.fn(),
  } as unknown as ProjectAccessService;

  beforeEach(() => jest.clearAllMocks());

  it("maps a concurrent member insert to HTTP 409", async () => {
    const prisma = {
      projectMember: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockRejectedValue(prismaError("P2002")),
      },
    } as unknown as PrismaService;
    const service = new MemberService(prisma, access, {
      publishProject: jest.fn(),
    } as unknown as TaskCalendarEventService);

    await expect(
      service.add(crypto.randomUUID(), crypto.randomUUID(), {
        userId: crypto.randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("maps the one-active-sprint unique constraint to HTTP 409", async () => {
    const projectId = crypto.randomUUID();
    const prisma = {
      sprint: {
        findUnique: jest.fn().mockResolvedValue({
          id: crypto.randomUUID(),
          projectId,
          status: SprintStatus.PLANNED,
          version: BigInt(0),
        }),
        update: jest.fn().mockRejectedValue(prismaError("P2002")),
      },
    } as unknown as PrismaService;
    const service = new SprintService(prisma, access);

    await expect(
      service.start(crypto.randomUUID(), crypto.randomUUID()),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
