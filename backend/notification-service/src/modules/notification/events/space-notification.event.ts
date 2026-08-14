import { Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { KAFKA_EVENTS, KAFKA_TOPICS } from "../../../common/constants/kafka.constants";
import { SpaceInvitationNotificationHandler } from "./space-invitation-notification.service";
import type {
  KafkaNotificationMessage,
  KafkaNotificationPayload,
} from "../types/notification.types";

@Controller()
export class SpaceNotificationEvent {
  private readonly logger = new Logger(SpaceNotificationEvent.name);

  constructor(
    private readonly spaceInvitationHandler: SpaceInvitationNotificationHandler,
  ) {}

  @EventPattern(KAFKA_TOPICS.NOTIFICATION_TOPIC)
  async handleSpaceInvitationNotificationEvent(
    @Payload() data: KafkaNotificationMessage,
  ): Promise<void> {
    const payload = this.toPayload(data);

    if (!this.isSpaceNotification(payload)) {
      this.logger.warn(`Ignoring unsupported notification type: ${payload.type}`);
      return;
    }

    try {
      await this.spaceInvitationHandler.handle(payload);
    } catch (error) {
      this.logger.error("Failed to process space notification event", error);
    }
  }

  private toPayload(data: KafkaNotificationMessage): KafkaNotificationPayload {
    return (data.value ?? data) as KafkaNotificationPayload;
  }

  private isSpaceNotification(payload: KafkaNotificationPayload): boolean {
    return (
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_INVITATION ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_INVITATION_ACCEPTED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_INVITATION_DECLINED
    );
  }
}
