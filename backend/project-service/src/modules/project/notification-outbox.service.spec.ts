import { Prisma } from "@prisma/client";
import { RuntimeConfigService } from "../../common/config/runtime-config.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { NotificationGateway } from "./communication/project-communication.port";
import { InvitationEmailService } from "./invitation-email.service";
import { NotificationOutboxService } from "./notification-outbox.service";
import { TaskCalendarEventService } from "./task-calendar-event.service";

describe("NotificationOutboxService", () => {
  const queryRaw = jest.fn();
  const executeRaw = jest.fn().mockResolvedValue(1);
  const send = jest.fn();
  const sendInvitation = jest.fn();
  const updateProjectInvitationStatus = jest.fn();
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
    { send: sendInvitation } as unknown as InvitationEmailService,
    { deliverUpsert } as unknown as TaskCalendarEventService,
  );

  beforeEach(() => {
    queryRaw.mockReset();
    executeRaw.mockClear();
    send.mockReset();
    sendInvitation.mockReset();
    updateProjectInvitationStatus.mockReset();
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
