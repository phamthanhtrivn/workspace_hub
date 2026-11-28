import { Injectable, Logger } from '@nestjs/common';
import { DocumentItem } from '@prisma/client';
import { ProjectDocumentRealtimeClient } from './project-document-realtime.client';

@Injectable()
export class DocumentEventPublisher {
  private readonly logger = new Logger('DocumentService');
  constructor(
    private readonly projectDocumentRealtime: ProjectDocumentRealtimeClient,
  ) {}
  toDocumentEventData(
    item: Pick<DocumentItem, 'id' | 'name' | 'type' | 'parentFolderId'>,
  ) {
    return {
      id: item.id,
      name: item.name,
      type: item.type,
      parentFolderId: item.parentFolderId,
    };
  }

  async publishProjectDocumentEvent(
    item: Pick<
      DocumentItem,
      'id' | 'name' | 'type' | 'parentFolderId' | 'projectId'
    >,
    actorId: string,
    action: 'CREATED' | 'UPDATED' | 'DELETED',
  ): Promise<void> {
    if (!item.projectId) return;
    try {
      await this.projectDocumentRealtime.publish({
        projectId: item.projectId,
        action,
        actorId,
        entityId: item.id,
        parentFolderId: item.parentFolderId,
        data: this.toDocumentEventData(item),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(
        `Failed to publish project document event for ${item.id}: ${reason}`,
      );
    }
  }
}
