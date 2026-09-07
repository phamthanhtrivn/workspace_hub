import assert from "node:assert/strict";
import { of } from "rxjs";
import { NotificationService } from "../src/modules/notification/notification.service";
import { ProjectNotificationEvent } from "../src/modules/notification/events/project-notification.event";

async function verifyIdempotentClaim(): Promise<void> {
  let notificationCreates = 0;
  const transaction = {
    $executeRaw: () => Promise.resolve(0),
    notification: {
      create: () => {
        notificationCreates += 1;
        return Promise.resolve({});
      },
    },
  };
  const prisma = {
    $transaction: (callback: (tx: typeof transaction) => Promise<unknown>) =>
      callback(transaction),
  };
  const service = new NotificationService(
    prisma as never,
    {} as never,
    {} as never,
  );

  const result = await service.createNotificationFromEvent(
    crypto.randomUUID(),
    "PROJECT_NOTIFICATION_REQUESTED",
    {
      recipientId: crypto.randomUUID(),
      type: "PROJECT_TASK_UPDATED" as never,
      title: "Task updated",
      content: "Changed",
    },
  );

  assert.equal(result, null);
  assert.equal(notificationCreates, 0);
}

async function verifyRetryAndDltRouting(): Promise<void> {
  const published: Array<{ topic: string; message: Record<string, unknown> }> = [];
  const kafka = {
    emit: (topic: string, message: Record<string, unknown>) => {
      published.push({ topic, message });
      return of(undefined);
    },
  };
  const notifications = {
    createNotificationFromEvent: () =>
      Promise.reject(new Error("database unavailable")),
  };
  const handler = new ProjectNotificationEvent(
    notifications as never,
    {} as never,
    kafka as never,
  );
  const event = {
    eventId: crypto.randomUUID(),
    eventType: "PROJECT_NOTIFICATION_REQUESTED",
    schemaVersion: 1,
    producer: "project-service",
    aggregateId: crypto.randomUUID(),
    occurredAt: "2026-09-07T10:00:00.000Z",
    deliveryAttempt: 0,
    payload: {
      recipientId: crypto.randomUUID(),
      type: "PROJECT_TASK_UPDATED",
      title: "Task updated",
      content: "Changed",
    },
  };

  await handler.handleProjectNotification(event);
  assert.equal(published[0]?.topic, "project-notification-events-retry");
  assert.equal(
    (published[0]?.message.value as { deliveryAttempt: number }).deliveryAttempt,
    1,
  );

  await handler.handleProjectNotification({ ...event, deliveryAttempt: 3 });
  assert.equal(published[1]?.topic, "project-notification-events-dlt");
}

async function main(): Promise<void> {
  await verifyIdempotentClaim();
  await verifyRetryAndDltRouting();
  console.log("Project notification event verification passed");
}

void main();
