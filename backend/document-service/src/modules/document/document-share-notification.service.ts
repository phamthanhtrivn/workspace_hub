import { Injectable } from '@nestjs/common';
import { DocumentItem, Prisma, SharePermission } from '@prisma/client';

export const DOCUMENT_NOTIFICATION = {
  SHARED: 'DOCUMENT_SHARED',
  PERMISSION_UPDATED: 'DOCUMENT_PERMISSION_UPDATED',
  TOPIC: 'notification-topic',
  POLL_MS: 3_000,
  BATCH_SIZE: 25,
  LEASE_MS: 60_000,
  RETRY_MAX_MS: 300_000,
} as const;

@Injectable()
export class DocumentShareNotificationService {
  async enqueue(
    tx: Prisma.TransactionClient,
    item: DocumentItem,
    actorId: string,
    recipientId: string | null | undefined,
    permission: SharePermission,
    previousPermission?: SharePermission,
  ) {
    if (
      item.projectId ||
      !recipientId ||
      actorId === recipientId ||
      previousPermission === permission
    )
      return;
    const sender = await tx.userProfileSnapshot.findUnique({
      where: { userId: actorId },
    });
    const changed = previousPermission !== undefined;
    const link =
      item.type === 'FOLDER'
        ? `/documents?view=shared&folderId=${item.id}`
        : `/documents?view=shared&documentId=${item.id}`;
    const payload = {
      recipientId,
      senderId: actorId,
      senderName: sender?.fullName ?? sender?.email ?? 'A workspace member',
      senderAvatar: sender?.avatarUrl ?? undefined,
      type: changed
        ? DOCUMENT_NOTIFICATION.PERMISSION_UPDATED
        : DOCUMENT_NOTIFICATION.SHARED,
      title: changed
        ? 'Document sharing permission changed'
        : `A ${item.type === 'FOLDER' ? 'folder' : 'file'} was shared with you`,
      content: `${sender?.fullName || sender?.email || 'A workspace member'} ${changed ? 'updated your access to' : 'shared'} "${item.name}"${changed ? '' : ' with you'}. Your permission: ${permission === 'EDITOR' ? 'Editor' : 'Viewer'}.`,
      link,
      metadata: {
        documentId: item.id,
        documentName: item.name,
        itemType: item.type,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes.toString(),
        ownerId: item.ownerUserId,
        permission,
        previousPermission: previousPermission ?? null,
        sharedAt: new Date().toISOString(),
      },
    };
    const deliveryId = crypto.randomUUID();
    await tx.$executeRaw`INSERT INTO document_notification_outbox (id, payload)
      VALUES (${deliveryId}::uuid, ${JSON.stringify({ ...payload, metadata: { ...payload.metadata, deliveryId } })}::jsonb)`;
  }
}
