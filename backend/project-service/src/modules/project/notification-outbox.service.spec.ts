import { Prisma } from "@prisma/client";
import { RuntimeConfigService } from "../../common/config/runtime-config.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  NotificationGateway,
  UserDirectory,
} from "./communication/project-communication.port";
import { InvitationEmailService } from "./invitation-email.service";
import { NotificationOutboxService } from "./notification-outbox.service";
import { TaskCalendarEventService } from "./task-calendar-event.service";

describe("NotificationOutboxService", () => {
  const queryRaw = jest.fn();
  const executeRaw = jest.fn().mockResolvedValue(1);
  const send = jest.fn();
  const sendInvitation = jest.fn();
  const updateProjectInvitationStatus = jest.fn();
  const getContact = jest.fn();
  const deliverUpsert = jest.fn();
  const service = new NotificationOutboxService(
    {
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    } as unknown as PrismaService,
    {
      outboxPollIntervalMs: 2_000,
      outboxBatchSize: 20,
      outboxMaxAttempts: 5,
    } as RuntimeConfigService,
    { send, updateProjectInvitationStatus } as unknown as NotificationGateway,
    { getContact } as unknown as UserDirectory,
    { send: sendInvitation } as unknown as InvitationEmailService,
    { deliverUpsert } as unknown as TaskCalendarEventService,
  );

  beforeEach(() => {
    queryRaw.mockReset();
    executeRaw.mockClear();
    send.mockReset();
    sendInvitation.mockReset();
    updateProjectInvitationStatus.mockReset();
    getContact.mockReset();
    deliverUpsert.mockReset();
  });

  it("delivers a claimed notification and marks it sent", async () => {
    queryRaw.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        eventType: "PROJECT_NOTIFICATION",
        payload: {
          recipientId: crypto.randomUUID(),
          type: "PROJECT_TASK_UPDATED",
          title: "Task updated",
          content: "Changed",
        } satisfies Prisma.JsonObject,
        attemptCount: 0,
      },
    ]);
    send.mockResolvedValue(undefined);

    await service.drain();

    expect(send).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(
      (executeRaw.mock.calls[0][0] as TemplateStringsArray).join(""),
    ).toContain("status = 'SENT'");
  });

  it("records a retry when delivery fails", async () => {
    queryRaw.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        eventType: "PROJECT_NOTIFICATION",
        payload: {
          recipientId: crypto.randomUUID(),
          type: "PROJECT_TASK_UPDATED",
          title: "Task updated",
          content: "Changed",
        } satisfies Prisma.JsonObject,
        attemptCount: 0,
      },
    ]);
    send.mockRejectedValue(new Error("notification unavailable"));

    await service.drain();

    expect(
      (executeRaw.mock.calls[0][0] as TemplateStringsArray).join(""),
    ).toContain("status = 'FAILED'");
  });

  it("adds inviter identity when delivering a project invitation", async () => {
    const senderId = crypto.randomUUID();
    queryRaw.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        eventType: "PROJECT_NOTIFICATION",
        payload: {
          recipientId: crypto.randomUUID(),
          senderId,
          type: "PROJECT_INVITATION",
          title: "Project invitation",
          content: "You were invited",
        } satisfies Prisma.JsonObject,
        attemptCount: 0,
      },
    ]);
    getContact.mockResolvedValue({
      email: "owner@example.com",
      fullName: "Nguyen Minh Anh",
      avatarUrl: "https://cdn.example.com/owner.png",
    });
    send.mockResolvedValue(undefined);

    await service.drain();

    expect(getContact).toHaveBeenCalledWith(senderId);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        senderId,
        senderName: "Nguyen Minh Anh",
        senderAvatar: "https://cdn.example.com/owner.png",
      }),
    );
  });

  it("keeps calendar events retryable after the normal attempt limit and delivers after recovery", async () => {
    const taskId = crypto.randomUUID();
    queryRaw.mockResolvedValue([{ id: crypto.randomUUID(), eventType: "PROJECT_TASK_CALENDAR", payload: { taskId }, attemptCount: 6 }]);
    deliverUpsert.mockRejectedValueOnce(new Error("Kafka offline")).mockResolvedValueOnce(undefined);
    await service.drain();
    const failed = executeRaw.mock.calls[0];
    expect((failed[0] as TemplateStringsArray).join("")).toContain("status = 'FAILED'");
    expect(failed.slice(1).some((value: unknown) => value instanceof Date)).toBe(true);
    await service.drain();
    expect(deliverUpsert).toHaveBeenCalledWith(taskId);
    expect((executeRaw.mock.calls[1][0] as TemplateStringsArray).join("")).toContain("status = 'SENT'");
  });

  it("delivers a project invitation response status", async () => {
    const invitationId = crypto.randomUUID();
    const recipientId = crypto.randomUUID();
    queryRaw.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        eventType: "PROJECT_INVITATION_STATUS",
        payload: {
          invitationId,
          recipientId,
          status: "ACCEPTED",
        } satisfies Prisma.JsonObject,
        attemptCount: 0,
      },
    ]);
    updateProjectInvitationStatus.mockResolvedValue(undefined);

    await service.drain();

    expect(updateProjectInvitationStatus).toHaveBeenCalledWith(
      invitationId,
      recipientId,
      "ACCEPTED",
    );
    expect(
      (executeRaw.mock.calls[0][0] as TemplateStringsArray).join(""),
    ).toContain("status = 'SENT'");
  });
});
