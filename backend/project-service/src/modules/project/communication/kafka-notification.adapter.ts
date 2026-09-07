import { Inject, Injectable } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { PROJECT_KAFKA_CLIENT } from "../../../infrastructure/kafka/project-kafka.module";
import {
  NotificationGateway,
  ProjectNotificationEvent,
} from "./project-communication.port";

export const PROJECT_NOTIFICATION_TOPIC = "project-notification-events";

@Injectable()
export class KafkaNotificationAdapter implements NotificationGateway {
  constructor(
    @Inject(PROJECT_KAFKA_CLIENT) private readonly kafka: ClientKafka,
  ) {}

  async publish(event: ProjectNotificationEvent): Promise<void> {
    await lastValueFrom(
      this.kafka.emit(PROJECT_NOTIFICATION_TOPIC, {
        key: event.aggregateId,
        value: event,
        headers: {
          "event-id": event.eventId,
          "event-type": event.eventType,
          "schema-version": String(event.schemaVersion),
        },
      }),
    );
  }
}
