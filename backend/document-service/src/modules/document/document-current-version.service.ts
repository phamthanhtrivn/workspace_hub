import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { DocumentRole } from '../../common/enums/document.enum';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';
import { DocumentAccessService } from './document-access.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentPresentationService } from './document-presentation.service';
import { DOCUMENT_BULK } from './types/document-bulk.constants';
import { DOCUMENT_VERSION_MESSAGES } from './types/document-version.constants';

@Injectable()
export class DocumentCurrentVersionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly storage: S3Service,
    private readonly events: DocumentEventPublisher,
    private readonly presentation: DocumentPresentationService,
  ) {}

  async setCurrentVersion(
    id: string,
    versionId: string,
    userId?: string,
    userEmail?: string,
  ) {
    await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      // Serialize with version uploads, which lock the same document row.
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
      if (!version.s3Key)
        throw new BadRequestException(DOCUMENT_VERSION_MESSAGES.missingFile);
      if (version.s3Key === item.s3Key) return item;
      const metadata = await this.storage.getFileMetadata(version.s3Key);
      if (BigInt(metadata.sizeBytes) !== version.sizeBytes)
        throw new ConflictException(DOCUMENT_VERSION_MESSAGES.sizeMismatch);

      return tx.documentItem.update({
        where: { id },
        data: {
          s3Key: version.s3Key,
          sizeBytes: version.sizeBytes,
          mimeType: metadata.mimeType,
        },
      });
    });
    await this.events.publishProjectDocumentEvent(
      updated,
      userId || DOCUMENT_CONSTANTS.ANONYMOUS_USER_ID,
      'UPDATED',
    );

    return this.presentation.enrichDocumentItem(updated);
  }
}
