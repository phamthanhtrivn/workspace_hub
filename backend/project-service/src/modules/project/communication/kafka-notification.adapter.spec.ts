import { ClientKafka } from "@nestjs/microservices";
import { of } from "rxjs";
import { KafkaNotificationAdapter } from "./kafka-notification.adapter";

describe("KafkaNotificationAdapter", () => {
  it("publishes the event using the aggregate id as Kafka key", async () => {
    const emit = jest.fn().mockReturnValue(of(undefined));
    const adapter = new KafkaNotificationAdapter({ emit } as unknown as ClientKafka);
    const event = {
      eventId: crypto.randomUUID(),
      eventType: "PROJECT_NOTIFICATION_REQUESTED" as const,
      schemaVersion: 1 as const,
      producer: "project-service" as const,
      aggregateId: crypto.randomUUID(),
      occurredAt: "2026-09-07T10:00:00.000Z",
      deliveryAttempt: 0 as const,
      payload: {
        recipientId: crypto.randomUUID(),
        type: "PROJECT_TASK_UPDATED",
        title: "Task updated",
        content: "Changed",
      },
    };

    await adapter.publish(event);

    expect(emit).toHaveBeenCalledWith(
      "project-notification-events",
      expect.objectContaining({
        key: event.aggregateId,
        value: event,
        headers: expect.objectContaining({ "event-id": event.eventId }),
      }),
    );
  });
});
