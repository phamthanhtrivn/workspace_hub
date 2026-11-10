import { randomUUID } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DocumentItem,
  SharePermission,
  LinkAccess,
  DocumentShare,
  Prisma,
} from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { UserProfileSnapshotResponse } from '../user-profile-snapshot/types/user-profile-snapshot.types';
import { DocumentAccessService } from './document-access.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentShareNotificationService } from './document-share-notification.service';

@Injectable()
export class DocumentSharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly access: DocumentAccessService,
    private readonly events: DocumentEventPublisher,
    private readonly notifications: DocumentShareNotificationService,
  ) {}
  async getSharing(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<{
    linkAccess: LinkAccess;
    shares: Array<
      DocumentShare & { shareWithProfile: UserProfileSnapshotResponse | null }
    >;
  }> {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );
    const shares = await this.prisma.documentShare.findMany({
      where: { documentItemId: id },
      orderBy: { createdAt: 'asc' },
    });

    const enrichedShares =
      await this.userProfileSnapshotService.attachProfilesToDocumentShares(
        shares,
      );

    return {
      linkAccess: item.linkAccess,
      shares: enrichedShares,
    };
  }

  async updateLinkAccess(
    userId: string,
    userEmail: string,
    id: string,
    linkAccess: LinkAccess,
  ): Promise<DocumentItem> {
    await this.access.checkPersonalOwnerFeature(
      id,
      userId,
      userEmail,
      'Link sharing is',
    );

    const updated = await this.prisma.documentItem.update({
      where: { id },
      data: { linkAccess: linkAccess === LinkAccess.NONE ? LinkAccess.NONE : LinkAccess.VIEWER, shareToken: randomUUID() },
    });
    await this.events.publishProjectDocumentEvent(updated, userId, 'UPDATED');
    return updated;
  }

  async addShare(
    userId: string,
    userEmail: string,
    id: string,
    shareEmail: string,
    permission: SharePermission,
  ): Promise<DocumentShare> {
    const item = await this.access.checkPersonalOwnerFeature(
      id,
      userId,
      userEmail,
      'Direct sharing is',
    );

    if (shareEmail.toLowerCase() === item.ownerEmail.toLowerCase()) {
      throw new BadRequestException('Cannot share an item with its owner');
    }

    const share = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM document_items WHERE id = ${id}::uuid FOR UPDATE`;
      return this.upsertPersonalShare(tx, item, userId, shareEmail, permission);
    });

    await this.events.publishProjectDocumentEvent(item, userId, 'UPDATED');
    return share;
  }

  async removeShare(
    userId: string,
    userEmail: string,
    id: string,
    shareId: string,
  ): Promise<void> {
    const item = await this.access.checkPersonalOwnerFeature(
      id,
      userId,
      userEmail,
      'Direct sharing is',
    );

    const share = await this.prisma.documentShare.findUnique({
      where: { id: shareId },
    });

    if (!share || share.documentItemId !== id) {
      throw new NotFoundException('Share configuration not found');
    }

    await this.prisma.documentShare.delete({
      where: { id: shareId },
    });
    await this.events.publishProjectDocumentEvent(item, userId, 'UPDATED');
  }

  async addSharesBatch(
    userId: string,
    userEmail: string,
    id: string,
    emails: string[],
    permission: SharePermission,
  ): Promise<DocumentShare[]> {
    const item = await this.access.checkPersonalOwnerFeature(
      id,
      userId,
      userEmail,
      'Direct sharing is',
    );

    const shares = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM document_items WHERE id = ${id}::uuid FOR UPDATE`;
      const result: DocumentShare[] = [];
      for (const email of new Set(emails.map((email) => email.trim().toLowerCase()))) {
        if (email === item.ownerEmail.toLowerCase()) continue;
        result.push(await this.upsertPersonalShare(tx, item, userId, email, permission));
      }
      return result;
    });

    await this.events.publishProjectDocumentEvent(item, userId, 'UPDATED');
    return shares;
  }

  private async upsertPersonalShare(tx: Prisma.TransactionClient, item: DocumentItem,
    actorId: string, email: string, permission: SharePermission): Promise<DocumentShare> {
    const normalizedEmail = email.trim().toLowerCase();
    const where = { documentItemId_shareWithEmail: { documentItemId: item.id, shareWithEmail: normalizedEmail } };
    const previous = await tx.documentShare.findUnique({ where });
    const recipient = await tx.userProfileSnapshot.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } }, select: { userId: true },
    });
    const share = await tx.documentShare.upsert({
      where, update: { permission, ...(recipient ? { shareWithUserId: recipient.userId } : {}) },
      create: { documentItemId: item.id, shareWithEmail: normalizedEmail,
        shareWithUserId: recipient?.userId, permission },
    });
    await this.notifications.enqueue(tx, item, actorId, recipient?.userId ?? share.shareWithUserId, permission, previous?.permission);
    return share;
  }
}
