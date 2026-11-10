import { Injectable } from '@nestjs/common';
import { DocumentItem, Prisma, SharePermission } from '@prisma/client';

export const DOCUMENT_NOTIFICATION = {
  SHARED: 'DOCUMENT_SHARED',
  PERMISSION_UPDATED: 'DOCUMENT_PERMISSION_UPDATED',
  SHARE_REMOVED: 'DOCUMENT_SHARE_REMOVED',
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
    await this.persist(tx, item, actorId, recipientId, permission, previousPermission);
  }

  async enqueueRemoved(
    tx: Prisma.TransactionClient,
    item: DocumentItem,
    actorId: string,
    recipientId: string | null | undefined,
    previousPermission: SharePermission,
  ) {
    if (item.projectId || !recipientId || actorId === recipientId) return;
    await this.persist(tx, item, actorId, recipientId, null, previousPermission);
  }

  private async persist(
    tx: Prisma.TransactionClient,
    item: DocumentItem,
    actorId: string,
    recipientId: string,
    permission: SharePermission | null,
    previousPermission?: SharePermission,
  ) {
    const sender = await tx.userProfileSnapshot.findUnique({
      where: { userId: actorId },
    });
    const removed = permission === null;
    const changed = !removed && previousPermission !== undefined;
    const senderName = sender?.fullName || sender?.email || 'A workspace member';
    const permissionName = permission === SharePermission.EDITOR ? 'Editor' : 'Viewer';
    const previousPermissionName = previousPermission === SharePermission.EDITOR ? 'Editor' : 'Viewer';
    const link =
      item.type === 'FOLDER'
        ? `/documents?view=shared&folderId=${item.id}`
        : `/documents?view=shared&documentId=${item.id}`;
    const payload = {
      recipientId,
      senderId: actorId,
      senderName,
      senderAvatar: sender?.avatarUrl ?? undefined,
      type: removed ? DOCUMENT_NOTIFICATION.SHARE_REMOVED : changed
        ? DOCUMENT_NOTIFICATION.PERMISSION_UPDATED
        : DOCUMENT_NOTIFICATION.SHARED,
      title: removed ? 'Document sharing access removed' : changed
        ? 'Document sharing permission changed'
        : `A ${item.type === 'FOLDER' ? 'folder' : 'file'} was shared with you`,
      content: removed
        ? `${senderName} removed your direct share to "${item.name}". Previous permission: ${previousPermissionName}.`
        : changed
          ? `${senderName} updated your access to "${item.name}": ${previousPermissionName} → ${permissionName}.`
          : `${senderName} shared "${item.name}" with you. Your permission: ${permissionName}.`,
      link: removed ? undefined : link,
      metadata: {
        documentId: item.id,
        documentName: item.name,
        itemType: item.type,
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes.toString(),
        ownerId: item.ownerUserId,
        permission,
        previousPermission: previousPermission ?? null,
        ...(removed ? { removedAt: new Date().toISOString() } : { sharedAt: new Date().toISOString() }),
      },
    };
    const deliveryId = crypto.randomUUID();
    await tx.$executeRaw`INSERT INTO document_notification_outbox (id, payload)
      VALUES (${deliveryId}::uuid, ${JSON.stringify({ ...payload, metadata: { ...payload.metadata, deliveryId } })}::jsonb)`;
  }
}
