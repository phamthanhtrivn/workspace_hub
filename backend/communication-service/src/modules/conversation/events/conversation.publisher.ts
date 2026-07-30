import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_TOPICS, KAFKA_EVENTS } from '../../../common/constants/kafka.constants';

@Injectable()
export class ConversationEventPublisher {
  private readonly logger = new Logger(ConversationEventPublisher.name);

  constructor(
    @Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka,
  ) {}

  publishGroupInvitation(
    invitedUserId: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    invitationId: string,
    conversationId: string,
    conversationName: string | null,
    conversationAvatarUrl: string | null,
  ) {
    try {
      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: invitedUserId,
        value: {
          recipientId: invitedUserId,
          senderId: senderId,
          senderName: senderName,
          senderAvatar: senderAvatar,
          type: KAFKA_EVENTS.NOTIFICATION.CHAT_GROUP_INVITATION,
          title: 'Lời mời vào nhóm chat',
          content: `Bạn được mời vào nhóm chat ${conversationName || 'mới'}`,
          link: '/chat',
          metadata: {
            invitationId,
            conversationId,
            conversationName,
            conversationAvatarUrl,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to publish group invitation to Kafka for user ${invitedUserId}`, error);
    }
  }

  publishInvitationAccepted(
    invitedBy: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    conversationId: string,
    conversationName: string | null,
  ) {
    try {
      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: invitedBy,
        value: {
          recipientId: invitedBy,
          senderId: senderId,
          senderName: senderName,
          senderAvatar: senderAvatar,
          type: KAFKA_EVENTS.NOTIFICATION.CHAT_INVITATION_ACCEPTED,
          title: 'Lời mời đã được chấp nhận',
          content: 'Chấp nhận lời mời vào nhóm',
          link: `/chat?id=${conversationId}`,
          metadata: {
            conversationId,
            conversationName,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to publish invitation accepted event for user ${invitedBy}`, error);
    }
  }

  publishInvitationDeclined(
    invitedBy: string,
    senderId: string,
    senderName: string,
    senderAvatar: string,
    conversationId: string,
    conversationName: string | null | undefined,
  ) {
    try {
      this.kafkaClient.emit(KAFKA_TOPICS.NOTIFICATION_TOPIC, {
        key: invitedBy,
        value: {
          recipientId: invitedBy,
          senderId: senderId,
          senderName: senderName,
          senderAvatar: senderAvatar,
          type: KAFKA_EVENTS.NOTIFICATION.CHAT_INVITATION_DECLINED,
          title: 'Lời mời bị từ chối',
          content: 'Từ chối lời mời vào nhóm',
          link: `/chat`,
          metadata: {
            conversationId,
            conversationName,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Failed to publish invitation declined event for user ${invitedBy}`, error);
    }
  }
}
