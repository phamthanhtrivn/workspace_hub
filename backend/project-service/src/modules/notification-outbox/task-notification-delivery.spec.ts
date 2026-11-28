import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import type { PrismaService } from "../../common/prisma/prisma.service";
import type { RuntimeConfigService } from "../../common/config/runtime-config.service";
import type { InvitationEmailService } from "../invitation-delivery/invitation-email.service";
import type {
  NotificationGateway,
  ProjectNotification,
  UserDirectory,
} from "../../common/adapters/project-communication.port";
import { buildTaskNotification } from "../../common/utils/task-notification.util";
import { KAFKA_EVENTS } from "../../common/constants/kafka.constants";
import { NotificationOutboxService } from "./notification-outbox.service";

function fixture(
  type:
    | typeof KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED
    | typeof KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED,
) {
  const notification = buildTaskNotification({
    type,
    senderId: "actor",
    recipientId: "assignee",
    project: { id: "project", name: "Workspace" },
    task: { id: "task", title: "Review", taskNumber: 4 },
  });
  const sql: string[] = [];
  const delivered: ProjectNotification[] = [];
  const record = {
    id: "delivery",
    eventType: "PROJECT_NOTIFICATION",
    payload: notification,
    attemptCount: 0,
    leaseToken: "lease",
  };
  const prisma = {
    $queryRaw: async () => [record],
    $executeRaw: async (strings: TemplateStringsArray) => {
      sql.push(strings.join("?"));
      return 1;
    },
  };
  const gateway = {
    send: async (event: ProjectNotification) => {
      delivered.push(event);
    },
  };
  const users = {
    getContact: async () => ({
      email: "test@example.invalid",
      fullName: "Alex",
      avatarUrl: "avatar-reference",
    }),
  };
  const service = new NotificationOutboxService(
    prisma as unknown as PrismaService,
    { outboxMaxAttempts: 5 } as RuntimeConfigService,
    gateway as unknown as NotificationGateway,
    users as UserDirectory,
    {} as InvitationEmailService,
  );
  return { service, notification, record, sql, delivered, users, gateway };
}

for (const type of [
  KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED,
  KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED,
]) {
  test(`${type} enriches the actor and preserves the outbox delivery ID`, async () => {
    const context = fixture(type);
    await context.service.drain();
    assert.equal(context.delivered.length, 1);
    assert.equal(context.delivered[0].senderName, "Alex");
    assert.equal(context.delivered[0].senderAvatar, "avatar-reference");
    assert.equal(context.delivered[0].metadata?.deliveryId, context.record.id);
    assert.match(context.delivered[0].content, /Alex.*TASK-4.*Workspace/);
    assert.ok(context.sql.some((sql) => sql.includes("status = 'SENT'")));
  });
}

test("a temporary actor lookup failure leaves the notification eligible for retry", async () => {
  const context = fixture(KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED);
  context.users.getContact = async () => {
    throw new Error("Test directory unavailable");
  };
  await context.service.drain();
  assert.equal(context.delivered.length, 0);
  assert.ok(
    context.sql.some(
      (sql) =>
        sql.includes("status = 'FAILED'") && sql.includes("next_attempt_at"),
    ),
  );
  assert.ok(!context.sql.some((sql) => sql.includes("status = 'SENT'")));
});

test("legacy pending task notifications keep their existing content while gaining actor information", async () => {
  const context = fixture(KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED);
  context.notification.metadata = { taskId: "task", projectId: "project" };
  context.notification.content = "Original assignment message";
  await context.service.drain();
  assert.equal(context.delivered[0].content, "Original assignment message");
  assert.equal(context.delivered[0].senderName, "Alex");
});
