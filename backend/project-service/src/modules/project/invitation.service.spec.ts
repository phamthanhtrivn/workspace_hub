import { PrismaService } from "../../common/prisma/prisma.service";
import { InvitationService } from "./invitation.service";
import { NotificationOutboxService } from "./notification-outbox.service";
import { ProjectAccessService } from "./project-access.service";
import { InvitationStatus } from "./project.enums";
import { TaskCalendarEventService } from "./task-calendar-event.service";

describe("InvitationService management", () => {
  const projectId = crypto.randomUUID();
  const inviterId = crypto.randomUUID();
  const invitedUserId = crypto.randomUUID();
  const invitationId = crypto.randomUUID();
  const now = new Date("2026-08-27T08:00:00.000Z");

  const requireCanInvite = jest.fn();
  const isActiveMember = jest.fn();
  const findFirst = jest.fn();
  const findMany = jest.fn();
  const updateMany = jest.fn();
  const enqueueProjectInvitationStatus = jest.fn();
  const enqueueInvitationEmail = jest.fn();
  const enqueueNotification = jest.fn();
  const transaction = jest.fn();

  const prisma = {
    projectInvitation: { findFirst, findMany, updateMany },
    $transaction: transaction,
  } as unknown as PrismaService;
  const access = {
    requireCanInvite,
    isActiveMember,
  } as unknown as ProjectAccessService;
  const notifications = {
    enqueueProjectInvitationStatus,
    enqueueInvitationEmail,
    enqueueNotification,
  } as unknown as NotificationOutboxService;
  const calendarEvents = {
    publishProject: jest.fn(),
  } as unknown as TaskCalendarEventService;
  const service = new InvitationService(
    prisma,
    access,
    calendarEvents,
    notifications,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    requireCanInvite.mockResolvedValue(undefined);
    isActiveMember.mockResolvedValue(false);
  });

  it("lists only pending invitations for a project after checking invite permission", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findMany.mockResolvedValue([
      {
        id: invitationId,
        projectId,
        project: { name: "Workspace Hub" },
        invitedUserId,
        invitedBy: inviterId,
        status: InvitationStatus.PENDING,
        createdAt: now,
        respondedAt: null,
        expiresAt: new Date("2026-09-03T08:00:00.000Z"),
      },
    ]);

    const result = await service.findProjectPending(inviterId, projectId);

    expect(requireCanInvite).toHaveBeenCalledWith(inviterId, projectId);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId, status: InvitationStatus.PENDING },
      }),
    );
    expect(result).toHaveLength(1);
  });

  it("marks the bell notification as cancelled when an invitation is withdrawn", async () => {
    findFirst.mockResolvedValue({
      id: invitationId,
      projectId,
      invitedUserId,
      status: InvitationStatus.PENDING,
      expiresAt: new Date("2099-09-03T08:00:00.000Z"),
    });
    transaction.mockImplementation(async (callback) =>
      callback({
        projectInvitation: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        $executeRaw: jest.fn().mockResolvedValue(1),
      }),
    );

    await service.cancel(inviterId, projectId, invitationId);

    expect(enqueueProjectInvitationStatus).toHaveBeenCalledWith(
      invitationId,
      invitedUserId,
      InvitationStatus.CANCELLED,
      expect.anything(),
    );
  });

  it("replaces a pending invitation and delivers a fresh bell notification when resent", async () => {
    const expiresAt = new Date("2099-09-03T08:00:00.000Z");
    const create = jest.fn().mockImplementation(({ data }) =>
      Promise.resolve({
        ...data,
        project: { name: "Workspace Hub" },
        respondedAt: null,
      }),
    );
    findFirst.mockResolvedValue({
      id: invitationId,
      projectId,
      invitedUserId,
      invitedBy: inviterId,
      status: InvitationStatus.PENDING,
      expiresAt,
      project: { name: "Workspace Hub" },
    });
    transaction.mockImplementation(async (callback) =>
      callback({
        projectInvitation: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          create,
        },
        $executeRaw: jest.fn().mockResolvedValue(1),
      }),
    );

    const result = await service.resend(inviterId, projectId, invitationId);

    expect(result.id).not.toBe(invitationId);
    expect(enqueueProjectInvitationStatus).toHaveBeenCalledWith(
      invitationId,
      invitedUserId,
      InvitationStatus.CANCELLED,
      expect.anything(),
    );
    expect(enqueueInvitationEmail).toHaveBeenCalled();
    expect(enqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: invitedUserId,
        type: "PROJECT_INVITATION",
        metadata: expect.objectContaining({ status: InvitationStatus.PENDING }),
      }),
      expect.anything(),
    );
  });
});
