import { BadRequestException, Controller, Logger, UseInterceptors } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { KAFKA_EVENTS, KAFKA_TOPICS } from "../../../common/constants/kafka.constants";
import { NotificationService } from "../notification.service";
import { SpaceInvitationNotificationHandler } from "./space-invitation-notification.service";
import { InvalidKafkaEventInterceptor } from '../../../common/interceptors/invalid-kafka-event.interceptor';
import type {
  KafkaNotificationMessage,
  KafkaNotificationPayload,
} from "../types/notification.types";

@Controller()
@UseInterceptors(InvalidKafkaEventInterceptor)
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
      this.logger.warn('Ignoring unsupported notification type');
      return;
    }

    if (
      payload.type === KAFKA_EVENTS.NOTIFICATION.CHANNEL_MEMBER_ADDED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.CHANNEL_MEMBER_REMOVED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.CHANNEL_OWNERSHIP_TRANSFERRED
    ) {
      const metadata = payload.metadata;
      if (!payload.recipientId || !payload.senderId || !payload.title || !payload.content ||
        !metadata || ['channelId', 'channelName', 'spaceId', 'spaceName'].some(key => typeof metadata[key] !== 'string' || !metadata[key])) {
        throw new BadRequestException('Invalid channel membership notification payload');
      }
    }

    if (payload.type === KAFKA_EVENTS.NOTIFICATION.CHANNEL_OWNERSHIP_TRANSFERRED) {
      const metadata = payload.metadata;
      if (typeof metadata?.previousOwnerId !== 'string' ||
        !metadata.previousOwnerId || metadata.previousOwnerId !== payload.senderId ||
        metadata.newOwnerId !== payload.recipientId ||
        metadata.previousOwnerId === metadata.newOwnerId) {
        throw new BadRequestException('Invalid channel ownership notification payload');
      }
    }

    this.validateNotification(payload);
    await this.spaceInvitationHandler.handle(payload);
  }

  private toPayload(data: KafkaNotificationMessage): KafkaNotificationPayload {
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new BadRequestException('Invalid notification payload');
    const payload: unknown = 'value' in data ? data.value : data;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw new BadRequestException('Invalid notification payload');
    const candidate = payload as Record<string, unknown>;
    if (typeof candidate.type !== 'string')
      throw new BadRequestException('Invalid notification payload');
    return payload as KafkaNotificationPayload;
  }

  private validateNotification(payload: KafkaNotificationPayload): void {
    if (typeof payload.recipientId !== 'string' || !payload.recipientId ||
        typeof payload.title !== 'string' || !payload.title ||
        typeof payload.content !== 'string' || !payload.content ||
        ['senderId', 'senderName', 'senderAvatar', 'link'].some(key => {
          const value = (payload as unknown as Record<string, unknown>)[key];
          return value !== undefined && value !== null && typeof value !== 'string';
        }) ||
        (payload.metadata !== undefined &&
          (!payload.metadata || typeof payload.metadata !== 'object' || Array.isArray(payload.metadata))))
      throw new BadRequestException('Invalid notification payload');
  }

  private isSupportedNotification(payload: KafkaNotificationPayload): boolean {
    return (
      payload.type === KAFKA_EVENTS.NOTIFICATION.CHANNEL_MEMBER_ADDED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.CHANNEL_MEMBER_REMOVED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.CHANNEL_OWNERSHIP_TRANSFERRED ||
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
      payload.type === KAFKA_EVENTS.NOTIFICATION.MEETING_CANCELLED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.PROJECT_INVITATION ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_ASSIGNED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.PROJECT_TASK_UPDATED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.PROJECT_SPRINT_STARTED ||
      payload.type === KAFKA_EVENTS.NOTIFICATION.CALENDAR_REMINDER
    );
  }

  private async handleMeetingInvitationStatus(
    payload: KafkaNotificationPayload,
  ): Promise<void> {
    if (typeof payload.recipientId !== 'string' || !payload.recipientId) {
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
