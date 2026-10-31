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
} from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { UserProfileSnapshotResponse } from '../user-profile-snapshot/types/user-profile-snapshot.types';
import { DocumentAccessService } from './document-access.service';
import { DocumentEventPublisher } from './document-event-publisher.service';

@Injectable()
export class DocumentSharingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly access: DocumentAccessService,
    private readonly events: DocumentEventPublisher,
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
      data: { linkAccess },
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

    const share = await this.prisma.documentShare.upsert({
      where: {
        documentItemId_shareWithEmail: {
          documentItemId: id,
          shareWithEmail: shareEmail.toLowerCase(),
        },
      },
      update: { permission },
      create: {
        documentItemId: id,
        shareWithEmail: shareEmail.toLowerCase(),
        permission,
      },
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

    const shares: DocumentShare[] = [];
    for (const email of emails) {
      const normalizedEmail = email.toLowerCase();
      if (normalizedEmail === item.ownerEmail.toLowerCase()) {
        continue; // Cannot share with owner
      }

      const share = await this.prisma.documentShare.upsert({
        where: {
          documentItemId_shareWithEmail: {
            documentItemId: id,
            shareWithEmail: normalizedEmail,
          },
        },
        update: { permission },
        create: {
          documentItemId: id,
          shareWithEmail: normalizedEmail,
          permission,
        },
      });
      shares.push(share);
    }

    await this.events.publishProjectDocumentEvent(item, userId, 'UPDATED');
    return shares;
  }
}
