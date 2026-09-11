import { BadRequestException, Controller, Logger } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { KAFKA_EVENTS, KAFKA_TOPICS } from "../../../common/constants/kafka.constants";
import { NotificationService } from "../notification.service";
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
    private readonly notificationService: NotificationService,
  ) {}

  @EventPattern(KAFKA_TOPICS.NOTIFICATION_TOPIC)
  async handleSpaceInvitationNotificationEvent(
    @Payload() data: KafkaNotificationMessage,
  ): Promise<void> {
    const payload = this.toPayload(data);

    if (payload.type === KAFKA_EVENTS.NOTIFICATION.MEETING_INVITATION_STATUS) {
      await this.handleMeetingInvitationStatus(payload);
      return;
    }

    if (!this.isSupportedNotification(payload)) {
      this.logger.warn(`Ignoring unsupported notification type: ${payload.type}`);
      return;
    }

    await this.spaceInvitationHandler.handle(payload);
  }

  private toPayload(data: KafkaNotificationMessage): KafkaNotificationPayload {
    return (data.value ?? data) as KafkaNotificationPayload;
  }

  private isSupportedNotification(payload: KafkaNotificationPayload): boolean {
    return (
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_INVITATION ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_INVITATION_ACCEPTED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_INVITATION_DECLINED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_DISBANDED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_MEMBER_REMOVED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.CHANNEL_DISBANDED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.SPACE_OWNERSHIP_TRANSFERRED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.MEETING_INVITATION ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.MEETING_INVITATION_DECLINED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.MEETING_UPDATED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.MEETING_CANCELLED
    );
  }

  private async handleMeetingInvitationStatus(
    payload: KafkaNotificationPayload,
  ): Promise<void> {
    if (!payload.recipientId) {
      throw new BadRequestException("Missing notification recipientId");
    }
    const meetingId = payload.metadata?.meetingId;
    const status = payload.metadata?.status;
    if (
      typeof meetingId !== "string" ||
      (status !== "ACCEPTED" &&
        status !== "DECLINED" &&
        status !== "CANCELLED")
    ) {
      throw new BadRequestException("Invalid meeting invitation status payload");
    }

    const notification =
      await this.notificationService.resolveMeetingInvitation(
        meetingId,
        payload.recipientId,
        status,
      );
    if (!notification) {
      this.logger.warn(
        `Meeting invitation notification not found for meeting ${meetingId} and user ${payload.recipientId}`,
      );
    }
  }
}
