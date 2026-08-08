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
    channelId: string,
    conversationName: string | null,
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
          title: 'Lời mời đã được chấp nhận',
          content: 'Chấp nhận lời mời vào nhóm',
          link: `/chat?id=${channelId}`,
          metadata: {
            channelId,
            conversationName,
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
    channelId: string,
    conversationName: string | null | undefined,
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
          title: 'Lời mời bị từ chối',
          content: 'Từ chối lời mời vào nhóm',
          link: '/chat',
          metadata: {
            channelId,
            conversationName,
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
