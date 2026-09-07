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
  const publish = jest.fn();
  const buildInvitationEmail = jest.fn();
  const deliverUpsert = jest.fn();
  const service = new NotificationOutboxService(
    {
      $queryRaw: queryRaw,
      $executeRaw: executeRaw,
    } as unknown as PrismaService,
    {
      outboxPollIntervalMs: 2_000,
      outboxBatchSize: 20,
    } as RuntimeConfigService,
    { publish } as unknown as NotificationGateway,
    { build: buildInvitationEmail } as unknown as InvitationEmailService,
    { deliverUpsert } as unknown as TaskCalendarEventService,
  );

  beforeEach(() => {
    queryRaw.mockReset();
    executeRaw.mockClear();
    publish.mockReset();
    buildInvitationEmail.mockReset();
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
        createdAt: new Date("2026-09-07T10:00:00.000Z"),
      },
    ]);
    publish.mockResolvedValue(undefined);

    await service.drain();

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "PROJECT_NOTIFICATION_REQUESTED",
        schemaVersion: 1,
        producer: "project-service",
        deliveryAttempt: 0,
      }),
    );
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
        createdAt: new Date("2026-09-07T10:00:00.000Z"),
      },
    ]);
    publish.mockRejectedValue(new Error("Kafka unavailable"));

    await service.drain();

    expect(executeRaw.mock.calls[0]).toContain("FAILED");
  });

  it("keeps transient calendar failures retryable and delivers after recovery", async () => {
    const taskId = crypto.randomUUID();
    queryRaw.mockResolvedValue([{ id: crypto.randomUUID(), eventType: "PROJECT_TASK_CALENDAR", payload: { taskId }, attemptCount: 6, createdAt: new Date() }]);
    deliverUpsert.mockRejectedValueOnce(new Error("Kafka offline")).mockResolvedValueOnce(undefined);
    await service.drain();
    const failed = executeRaw.mock.calls[0];
    expect(failed).toContain("FAILED");
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
        createdAt: new Date("2026-09-07T10:00:00.000Z"),
      },
    ]);
    publish.mockResolvedValue(undefined);

    await service.drain();

    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateId: invitationId,
        eventType: "PROJECT_INVITATION_STATUS_CHANGED",
        payload: { invitationId, recipientId, status: "ACCEPTED" },
      }),
    );
    expect(
      (executeRaw.mock.calls[0][0] as TemplateStringsArray).join(""),
    ).toContain("status = 'SENT'");
  });

  it("moves malformed outbox payloads to DEAD without retrying", async () => {
    queryRaw.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        eventType: "PROJECT_NOTIFICATION",
        payload: { title: "missing required fields" },
        attemptCount: 0,
        createdAt: new Date(),
      },
    ]);

    await service.drain();

    const sql = (executeRaw.mock.calls[0][0] as TemplateStringsArray).join("");
    expect(sql).toContain("status = ");
    expect(executeRaw.mock.calls[0]).toContain("DEAD");
    expect(executeRaw.mock.calls[0]).toContain(null);
    expect(publish).not.toHaveBeenCalled();
  });
});
