import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { PrismaService } from '../../prisma/prisma.service';

export const DOCUMENT_ACCESS_REALTIME_TOPIC = 'document-access-realtime-v1';

@Injectable()
export class DocumentAccessRealtimePublisher implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentAccessRealtimePublisher.name);
  private producer?: Producer;
  private connecting?: Promise<void>;

  constructor(private readonly prisma: PrismaService) {}

  async publishForItem(documentId: string): Promise<void> {
    const documentIds = await this.getDocumentTreeIds(documentId);
    if (!documentIds.length) return;

    try {
      if (!this.producer) {
        const brokers = (process.env.KAFKA_BROKER ?? 'localhost:9092')
          .split(',')
          .map((broker) => broker.trim())
          .filter(Boolean);
        this.producer = new Kafka({
          clientId: 'document-access-realtime-producer',
          brokers,
        }).producer();
      }
      this.connecting ??= this.producer.connect().catch((error: unknown) => {
        this.connecting = undefined;
        throw error;
      });
      await this.connecting;
      await this.producer.send({
        topic: DOCUMENT_ACCESS_REALTIME_TOPIC,
        messages: [
          {
            key: documentId,
            value: JSON.stringify({ documentIds }),
          },
        ],
      });
    } catch (error) {
      this.logger.warn(
        `Document access update could not be published: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer?.disconnect();
  }

  private async getDocumentTreeIds(documentId: string): Promise<string[]> {
    const documentIds = [documentId];
    const visited = new Set(documentIds);
    let parentIds = [documentId];
    while (parentIds.length) {
      const children = await this.prisma.documentItem.findMany({
        where: { parentFolderId: { in: parentIds } },
        select: { id: true },
      });
      parentIds = children.map(({ id }) => id).filter((id) => !visited.has(id));
      parentIds.forEach((id) => visited.add(id));
      documentIds.push(...parentIds);
    }
    return documentIds;
  }
}
