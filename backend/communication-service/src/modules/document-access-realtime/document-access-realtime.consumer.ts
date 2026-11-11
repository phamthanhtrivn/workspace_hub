import { Controller, Logger } from '@nestjs/common';
import {
  EventPattern,
  KafkaRetriableException,
  Payload,
} from '@nestjs/microservices';
import { KAFKA_TOPICS } from '../../common/constants/kafka.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatSocketPublisher } from '../socket/chat/chat-socket.publisher';

interface DocumentAccessEvent {
  documentIds: string[];
}

@Controller()
export class DocumentAccessRealtimeConsumer {
  private readonly logger = new Logger(DocumentAccessRealtimeConsumer.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatSocket: ChatSocketPublisher,
  ) {}

  @EventPattern(KAFKA_TOPICS.DOCUMENT_ACCESS_REALTIME)
  async handle(@Payload() payload: unknown): Promise<void> {
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('documentIds' in payload) ||
      !Array.isArray(payload.documentIds) ||
      payload.documentIds.length === 0 ||
      !payload.documentIds.every(
        (id) => typeof id === 'string' && id.length > 0,
      )
    ) {
      this.logger.warn('Ignored invalid document access update event');
      return;
    }

    const event = payload as DocumentAccessEvent;
    try {
      const [channelMessages, directMessages] = await Promise.all([
        this.prisma.message.findMany({
          where: { type: 'DOCUMENT', content: { in: event.documentIds } },
          select: { channelId: true },
        }),
        this.prisma.directMessage.findMany({
          where: { type: 'DOCUMENT', content: { in: event.documentIds } },
          select: { conversationId: true },
        }),
      ]);
      const targets = new Map<
        string,
        { channelId: string } | { conversationId: string }
      >();
      for (const { channelId } of channelMessages) {
        if (channelId) targets.set(`channel:${channelId}`, { channelId });
      }
      for (const { conversationId } of directMessages) {
        targets.set(`direct:${conversationId}`, { conversationId });
      }
      await this.chatSocket.publishDocumentAccessUpdated(event.documentIds, [
        ...targets.values(),
      ]);
    } catch (error) {
      this.logger.error(
        `Document access update delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new KafkaRetriableException(
        'Document access update could not be delivered',
      );
    }
  }
}
