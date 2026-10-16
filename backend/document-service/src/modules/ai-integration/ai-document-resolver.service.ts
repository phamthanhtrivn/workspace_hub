import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { createHash } from 'node:crypto';
import { ItemType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { DocumentService } from '../document/document.service';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';
import { AI_DOCUMENT_MESSAGES } from './ai-integration.constants';
import type { AiDocumentReferenceDto } from './dto/resolve-ai-documents.dto';
import type { AiActor, AiDocumentManifest } from './types/ai-document.types';

@Injectable()
export class AiDocumentResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentService,
    private readonly storage: S3Service,
  ) {}

  private async assertActiveHierarchy(documentId: string): Promise<void> {
    const visited = new Set<string>();
    let current: string | null = documentId;
    while (current) {
      if (visited.has(current) || visited.size > 100)
        throw new BadRequestException(AI_DOCUMENT_MESSAGES.INVALID_SOURCE);
      visited.add(current);
      const item = await this.prisma.documentItem.findUnique({
        where: { id: current },
        select: { parentFolderId: true, isArchived: true },
      });
      if (!item)
        throw new NotFoundException(AI_DOCUMENT_MESSAGES.INVALID_SOURCE);
      if (item.isArchived)
        throw new ForbiddenException(AI_DOCUMENT_MESSAGES.ARCHIVED);
      current = item.parentFolderId;
    }
  }

  async resolve(
    actor: AiActor,
    reference: AiDocumentReferenceDto,
    withDownload: boolean,
  ): Promise<AiDocumentManifest> {
    await this.assertActiveHierarchy(reference.documentId);
    const item = await this.documents.checkPermission(
      reference.documentId,
      actor.id,
      actor.email,
    );
    if (item.type !== ItemType.FILE)
      throw new BadRequestException('Select files, not folders');
    const original = DOCUMENT_CONSTANTS.ORIGINAL_VERSION_ID;
    if (
      reference.versionId &&
      reference.versionId !== original &&
      !isUUID(reference.versionId)
    ) {
      throw new BadRequestException('Invalid document version');
    }
    const version = await this.prisma.documentVersion.findFirst({
      where: {
        documentItemId: item.id,
        ...(reference.versionId === original
          ? { versionNumber: 1 }
          : reference.versionId
            ? { id: reference.versionId }
            : {}),
      },
      orderBy: { versionNumber: 'desc' },
    });
    if (reference.versionId && reference.versionId !== original && !version) {
      throw new NotFoundException('Document version not found');
    }
    const key = version?.s3Key ?? item.s3Key;
    if (!key)
      throw new BadRequestException(AI_DOCUMENT_MESSAGES.INVALID_SOURCE);
    const object = await this.storage.describeAiSource(key, withDownload);
    const versionId =
      version && version.versionNumber !== 1 ? version.id : original;
    const revision = createHash('sha256')
      .update(
        JSON.stringify({
          key,
          versionId,
          etag: object.etag,
          objectVersionId: object.objectVersionId ?? null,
          sizeBytes: object.sizeBytes,
        }),
      )
      .digest('hex');
    if (reference.expectedRevision && revision !== reference.expectedRevision) {
      throw new ConflictException(AI_DOCUMENT_MESSAGES.SOURCE_CHANGED);
    }
    return {
      documentId: item.id,
      versionId,
      revision,
      name: item.name,
      mimeType: object.mimeType,
      sizeBytes: object.sizeBytes,
      etag: object.etag,
      objectVersionId: object.objectVersionId,
      downloadUrl: object.downloadUrl,
    };
  }
}
