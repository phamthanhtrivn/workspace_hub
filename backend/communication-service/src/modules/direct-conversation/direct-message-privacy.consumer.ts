import { Controller, UseInterceptors } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { isUUID } from 'class-validator';
import { KAFKA_CONFIG } from '../../infrastructure/kafka/kafka.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatEvent } from '../socket/chat/chat-socket.events';
import { SocketEventEmitter } from '../socket/services/socket-event-emitter';
import { claimUserEvent, InvalidUserEvent, type UserEventEnvelope } from '../../infrastructure/kafka/user-event-policy';
import { UserEventInterceptor } from '../../infrastructure/kafka/user-event.interceptor';

interface DirectMessagePrivacyEvent extends UserEventEnvelope {
  allowNewDirectMessages: boolean;
}

@Controller()
@UseInterceptors(UserEventInterceptor)
export class DirectMessagePrivacyConsumer {

  constructor(
    private readonly prisma: PrismaService,
    private readonly socketEventEmitter: SocketEventEmitter,
  ) {}

  @EventPattern(KAFKA_CONFIG.DIRECT_MESSAGE_PRIVACY_TOPIC)
  async handlePrivacyChanged(
    @Payload() event: DirectMessagePrivacyEvent,
  ): Promise<void> {
    if (
      !event ||
      !isUUID(event.userId) ||
      typeof event.allowNewDirectMessages !== 'boolean'
    ) {
      throw new InvalidUserEvent('Invalid direct message privacy event');
    }

    const conversations = await this.prisma.$transaction(async (tx) => {
      if (!(await claimUserEvent(tx, KAFKA_CONFIG.DIRECT_MESSAGE_PRIVACY_TOPIC, event))) return [];
      return tx.directConversation.findMany({
      where: {
        participants: { some: { userId: event.userId } },
        messages: { none: {} },
      },
      select: {
        id: true,
        participants: { select: { userId: true } },
      },
      });
    });

    for (const conversation of conversations) {
      for (const participant of conversation.participants) {
        if (participant.userId === event.userId) continue;
        this.socketEventEmitter.emitToUser(
          participant.userId,
          ChatEvent.DIRECT_MESSAGE_PERMISSION_UPDATED,
          {
            conversationId: conversation.id,
            recipientId: event.userId,
            allowNewDirectMessages: event.allowNewDirectMessages,
          },
        );
      }
    }
  }
}
