import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { StorageCleanupService } from './storage-cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EnsureProjectRootFolderDto } from './dto/ensure-project-root-folder.dto';
import { ItemType, DocumentItem, Prisma } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { QuotaService } from '../quota/quota.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { UPLOAD_POLICY } from '../../infrastructure/s3/upload-policy';
import { DocumentAccessService } from './document-access.service';
import { DocumentLocationService } from './document-location.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentPresentationService } from './document-presentation.service';

@Injectable()
export class ProjectDocumentAttachmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly storageCleanup: StorageCleanupService,
    private readonly quotaService: QuotaService,
    private readonly access: DocumentAccessService,
    private readonly locations: DocumentLocationService,
    private readonly events: DocumentEventPublisher,
    private readonly presentation: DocumentPresentationService,
  ) {}
  async resolveTaskAttachmentDocuments(
    userId: string,
    userEmail: string,
    projectId: string,
    documentItemIds: string[],
  ) {
    const uniqueIds = [...new Set(documentItemIds)];
    const documents: ReturnType<
      typeof this.toTaskAttachmentDocumentMetadata
    >[] = [];
    for (const documentItemId of uniqueIds) {
      const item = await this.access.checkPermission(
        documentItemId,
        userId,
        userEmail,
        DocumentRole.VIEWER,
      );
      this.assertAttachableFile(item);
      if (item.projectId !== projectId) {
        throw new ForbiddenException(
          'Document does not belong to this project',
        );
      }
      documents.push(this.toTaskAttachmentDocumentMetadata(item));
    }
    return documents;
  }

  async importTaskAttachmentDocuments(
    userId: string,
    userEmail: string,
    projectId: string,
    documentItemIds: string[],
    operationId?: string,
  ) {
    const root = await this.locations.findProjectRootFolder(projectId);
    const imported: ReturnType<typeof this.toTaskAttachmentDocumentMetadata>[] =
      [];
    for (const sourceId of new Set(documentItemIds)) {
      const source = await this.access.checkPermission(
        sourceId,
        userId,
        userEmail,
        DocumentRole.VIEWER,
      );
      this.assertAttachableFile(source);
      if (source.projectId || source.ownerUserId !== userId)
        throw new ForbiddenException(
          'Only your own personal files can be imported',
        );
      const importKey = operationId
        ? `${projectId}:${userId}:${operationId}:${sourceId}`
        : null;
      if (importKey) {
        const previous = await this.prisma.documentItem.findUnique({
          where: { importKey },
        });
        if (previous) {
          imported.push(this.toTaskAttachmentDocumentMetadata(previous));
          continue;
        }
      }
      const copiedKey = await this.s3Service.copyFile(
        source.s3Key!,
        userId,
        source.name,
      );
      let item: DocumentItem;
      try {
        await this.s3Service.assertUploadSize(
          copiedKey,
          Number(source.sizeBytes),
        );
        item = await this.prisma.$transaction(async (tx) => {
          if (importKey) {
            await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${importKey}, 8085))::text`;
            const previous = await tx.documentItem.findUnique({
              where: { importKey },
            });
            if (previous) {
              await this.storageCleanup.enqueue(tx, [copiedKey]);
              return previous;
            }
          }
          await this.quotaService.reserve(tx, userId, Number(source.sizeBytes));
          const name = await this.locations.getAvailableImportName(
            userId,
            source.name,
            root.id,
            projectId,
          );
          await this.locations.lockAvailableName(
            tx,
            userId,
            name,
            root.id,
            projectId,
          );
          return tx.documentItem.create({
            data: {
              name,
              type: ItemType.FILE,
              ownerUserId: userId,
              ownerEmail: userEmail,
              parentFolderId: root.id,
              projectId,
              s3Key: copiedKey,
              importKey,
              mimeType: source.mimeType,
              sizeBytes: source.sizeBytes,
              versions: {
                create: {
                  versionNumber: 1,
                  s3Key: copiedKey,
                  sizeBytes: source.sizeBytes,
                  uploadedBy: userId,
                },
              },
            },
          });
        });
      } catch (error) {
        await this.storageCleanup.enqueue(this.prisma, [copiedKey]);
        throw error;
      }
      await this.events.publishProjectDocumentEvent(item, userId, 'CREATED');
      imported.push(this.toTaskAttachmentDocumentMetadata(item));
    }
    return imported;
  }

  async ensureProjectRootFolder(
    projectId: string,
    dto: EnsureProjectRootFolderDto,
  ): Promise<DocumentItem> {
    const folder = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${projectId}, 8085))::text`;
      const existing = await tx.documentItem.findFirst({
        where: {
          projectId,
          parentFolderId: null,
          type: ItemType.FOLDER,
          isArchived: false,
        },
        orderBy: { createdAt: 'asc' },
      });
      const root =
        existing ??
        (await tx.documentItem.create({
          data: {
            name: this.locations.normalizeItemName(dto.name),
            type: ItemType.FOLDER,
            ownerUserId: dto.ownerId,
            ownerEmail: dto.ownerEmail.toLowerCase(),
            parentFolderId: null,
            projectId,
            sizeBytes: 0n,
          },
        }));
      await this.syncProjectRootShares(root, dto, tx);
      return tx.documentItem.findUniqueOrThrow({ where: { id: root.id } });
    });
    return this.presentation.enrichDocumentItem(folder);
  }

  async syncProjectRootShares(
    folder: DocumentItem,
    dto: EnsureProjectRootFolderDto,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const members = (dto.members ?? [])
      .filter((member) => member.userId !== folder.ownerUserId)
      .map((member) => ({
        userId: member.userId,
        email: member.email.toLowerCase(),
        permission: member.permission,
      }));
    const memberUserIds = [...new Set(members.map((member) => member.userId))];
    const memberEmails = [...new Set(members.map((member) => member.email))];

    await tx.$queryRaw`SELECT id FROM document_items WHERE id = ${folder.id}::uuid FOR UPDATE`;
    const current = await tx.documentItem.findUniqueOrThrow({
      where: { id: folder.id },
    });
    if (
      dto.syncRevision &&
      current.accessSyncRevision > BigInt(dto.syncRevision)
    )
      return;
    if (!dto.syncRevision && current.accessSyncRevision > 0n) return;
    await tx.documentItem.update({
      where: { id: folder.id },
      data: {
        name: this.locations.normalizeItemName(dto.name),
        ...(dto.syncRevision
          ? { accessSyncRevision: BigInt(dto.syncRevision) }
          : {}),
      },
    });
    for (const member of members) {
      await tx.documentShare.upsert({
        where: {
          documentItemId_shareWithEmail: {
            documentItemId: folder.id,
            shareWithEmail: member.email,
          },
        },
        update: {
          shareWithUserId: member.userId,
          permission: member.permission,
        },
        create: {
          documentItemId: folder.id,
          shareWithUserId: member.userId,
          shareWithEmail: member.email,
          permission: member.permission,
        },
      });
    }

    await tx.documentShare.deleteMany({
      where: {
        documentItemId: folder.id,
        shareWithUserId: { not: null },
        ...(memberUserIds.length === 0
          ? {}
          : {
              OR: [
                { shareWithUserId: { notIn: memberUserIds } },
                { shareWithEmail: { notIn: memberEmails } },
              ],
            }),
      },
    });
  }

  toTaskAttachmentDocumentMetadata(
    item: Pick<
      DocumentItem,
      'id' | 'name' | 'mimeType' | 'sizeBytes' | 'projectId'
    >,
  ) {
    return {
      id: item.id,
      name: item.name,
      mimeType: item.mimeType,
      sizeBytes: Number(item.sizeBytes),
      projectId: item.projectId,
    };
  }

  assertAttachableFile(item: DocumentItem) {
    if (item.type !== ItemType.FILE) {
      throw new BadRequestException('Only files can be attached to tasks');
    }
    if (item.isArchived) {
      throw new BadRequestException(
        'Archived or trashed documents cannot be attached',
      );
    }
    if (item.sizeBytes > BigInt(UPLOAD_POLICY.MAX_SIZE_BYTES)) {
      throw new BadRequestException('Attachments cannot exceed 10 MiB');
    }
    if (!item.s3Key) {
      throw new BadRequestException(
        'Document file is missing storage metadata',
      );
    }
  }
}
