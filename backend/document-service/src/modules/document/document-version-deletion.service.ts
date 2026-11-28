import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentRole } from '../../common/enums/document.enum';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';
import { DocumentAccessService } from './document-access.service';
import { StorageCleanupService } from './storage-cleanup.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DOCUMENT_BULK } from './types/document-bulk.constants';
import { DOCUMENT_VERSION_MESSAGES } from './types/document-version.constants';

@Injectable()
export class DocumentVersionDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly cleanup: StorageCleanupService,
    private readonly events: DocumentEventPublisher,
  ) {}

  async deleteVersion(
    id: string,
    versionId: string,
    userId?: string,
    userEmail?: string,
  ) {
    await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.OWNER,
    );
    const document = await this.prisma.$transaction(async (tx) => {
      // Use the same lock as uploads and Current selection to protect the final version.
      await tx.$queryRaw`SELECT id FROM document_items WHERE id = ${id}::uuid FOR UPDATE`;
      const item = await tx.documentItem.findUniqueOrThrow({ where: { id } });
      if (item.type === ItemType.FOLDER)
        throw new BadRequestException(DOCUMENT_VERSION_MESSAGES.folder);
      if (item.isArchived)
        throw new BadRequestException(DOCUMENT_VERSION_MESSAGES.unavailable);
      if (item.isStarred)
        throw new BadRequestException(DOCUMENT_BULK.STARRED_CREATE);
      const version = await tx.documentVersion.findUnique({
        where: { id: versionId, documentItemId: id },
      });
      if (!version)
        throw new NotFoundException(DOCUMENT_VERSION_MESSAGES.missingVersion);
      const count = await tx.documentVersion.count({
        where: { documentItemId: id },
      });
      if (count <= 1)
        throw new BadRequestException(DOCUMENT_VERSION_MESSAGES.lastDelete);
      if (version.s3Key === item.s3Key)
        throw new BadRequestException(DOCUMENT_VERSION_MESSAGES.currentDelete);
      await tx.documentVersion.delete({
        where: { id: versionId, documentItemId: id },
      });
      await tx.$executeRaw`UPDATE user_storage_quotas SET used_bytes = GREATEST(0, used_bytes - ${version.sizeBytes}), updated_at = NOW() WHERE user_id = ${item.ownerUserId}::uuid`;
      if (version.s3Key) await this.cleanup.enqueue(tx, [version.s3Key]);

      return item;
    });
    await this.events.publishProjectDocumentEvent(
      document,
      userId || DOCUMENT_CONSTANTS.ANONYMOUS_USER_ID,
      'UPDATED',
    );

    return { id: versionId, documentItemId: id };
  }
}
