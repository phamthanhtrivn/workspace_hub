import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import {
  KAFKA_EVENTS,
  KAFKA_TOPICS,
} from 'src/common/constants/kafka.constants';

@Injectable()
export class InvitationPublisher {
  private readonly logger = new Logger(InvitationPublisher.name);

  constructor(
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  publishInvitationAccepted(
    invitedBy: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    spaceId: string,
    spaceName: string | null,
  ) {
    try {
      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: invitedBy,
        value: {
          recipientId: invitedBy,
          senderId,
          senderName,
          senderAvatar,
          type: KAFKA_EVENTS.NOTIFICATION.CHAT_INVITATION_ACCEPTED,
          title: 'Invitation accepted',
          content: 'Accepted the space invitation',
          link: '/chat',
          metadata: {
            spaceId,
            spaceName,
            conversationName: spaceName,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish invitation accepted event for user ${invitedBy}`,
        error,
      );
    }
  }

  publishInvitationDeclined(
    invitedBy: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    spaceId: string,
    spaceName: string | null | undefined,
  ) {
    try {
      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: invitedBy,
        value: {
          recipientId: invitedBy,
          senderId,
          senderName,
          senderAvatar,
          type: KAFKA_EVENTS.NOTIFICATION.CHAT_INVITATION_DECLINED,
          title: 'Invitation declined',
          content: 'Declined the space invitation',
          link: '/chat',
          metadata: {
            spaceId,
            spaceName,
            conversationName: spaceName,
          },
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to publish invitation declined event for user ${invitedBy}`,
        error,
      );
    }
  }
}
