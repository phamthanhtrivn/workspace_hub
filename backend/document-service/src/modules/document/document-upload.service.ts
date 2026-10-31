import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import { ItemType, DocumentItem, DocumentVersion } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { QuotaService } from '../quota/quota.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { UserProfileSnapshotResponse } from '../user-profile-snapshot/types/user-profile-snapshot.types';
import { DocumentLocationService } from './document-location.service';
import { DocumentPresentationService } from './document-presentation.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentAccessService } from './document-access.service';

@Injectable()
export class DocumentUploadService {
  constructor(
    private readonly quotaService: QuotaService,
    private readonly s3Service: S3Service,
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly locations: DocumentLocationService,
    private readonly presentation: DocumentPresentationService,
    private readonly events: DocumentEventPublisher,
    private readonly access: DocumentAccessService,
  ) {}
  async initiateUpload(
    userId: string,
    userEmail: string,
    dto: InitiateUploadDto,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    const parentFolder = await this.locations.resolveWritableParentFolder(
      userId,
      userEmail,
      dto.parentFolderId,
      dto.projectId,
      'Cannot upload files into an archived or trashed folder',
    );

    const projectId = parentFolder?.projectId || dto.projectId || null;
    const overwriteTarget = await this.locations.validateUploadNameConflict(
      userId,
      userEmail,
      {
        name: dto.name,
        parentFolderId: parentFolder?.id ?? null,
        projectId,
        overwriteItemId: dto.overwriteItemId,
      },
    );

    await this.quotaService.checkQuota(
      overwriteTarget?.ownerUserId ?? userId,
      dto.sizeBytes,
    );
    const { presignedUrl, s3Key } =
      await this.s3Service.generatePresignedUploadUrl(
        userId,
        dto.name,
        dto.mimeType,
        dto.sizeBytes,
        { actorId: userId },
      );

    return { presignedUrl, s3Key };
  }

  async confirmUpload(
    userId: string,
    userEmail: string,
    dto: ConfirmUploadDto,
  ): Promise<DocumentItem> {
    const parentFolder = await this.locations.resolveWritableParentFolder(
      userId,
      userEmail,
      dto.parentFolderId,
      dto.projectId,
      'Cannot save documents into an archived or trashed folder',
    );

    const projectId = parentFolder?.projectId || dto.projectId || null;
    const normalizedName = this.locations.normalizeItemName(dto.name);
    // A lost HTTP response must not turn a committed upload into a name error.
    const committed = await this.prisma.documentItem.findFirst({
      where: {
        s3Key: dto.s3Key,
        ownerUserId: userId,
        projectId,
        parentFolderId: parentFolder?.id ?? null,
        name: normalizedName,
      },
    });
    if (committed) return this.presentation.enrichDocumentItem(committed);
    const overwriteTarget = await this.locations.validateUploadNameConflict(
      userId,
      userEmail,
      {
        name: normalizedName,
        parentFolderId: parentFolder?.id ?? null,
        projectId,
        overwriteItemId: dto.overwriteItemId,
      },
    );

    if (overwriteTarget) {
      const version = await this.createVersion(
        userId,
        userEmail,
        overwriteTarget.id,
        {
          s3Key: dto.s3Key,
          sizeBytes: dto.sizeBytes,
          mimeType: dto.mimeType,
        },
      );
      const updatedItem = await this.prisma.documentItem.findUnique({
        where: { id: version.documentItemId },
      });
      if (!updatedItem) {
        throw new NotFoundException('Document or folder not found');
      }
      return this.presentation.enrichDocumentItem(updatedItem);
    }

    await this.s3Service.assertUploadSize(dto.s3Key, dto.sizeBytes, {
      actorId: userId,
      mimeType: dto.mimeType,
      target: `new:${userId}`,
    });

    // Create DocumentItem and first Version in Database
    const item = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.s3Key}, 8085))::text`;
      const previous = await tx.documentItem.findFirst({
        where: { s3Key: dto.s3Key, ownerUserId: userId },
      });
      if (previous) return previous;
      await this.quotaService.reserve(tx, userId, dto.sizeBytes);
      await this.locations.lockAvailableName(
        tx,
        userId,
        normalizedName,
        parentFolder?.id ?? null,
        projectId,
      );
      const createdItem = await tx.documentItem.create({
        data: {
          name: normalizedName,
          type: ItemType.FILE,
          ownerUserId: userId,
          ownerEmail: userEmail,
          parentFolderId: parentFolder?.id ?? null,
          projectId,
          s3Key: dto.s3Key,
          mimeType: dto.mimeType,
          sizeBytes: BigInt(dto.sizeBytes),
        },
      });

      await tx.documentVersion.create({
        data: {
          documentItemId: createdItem.id,
          versionNumber: 1,
          s3Key: dto.s3Key,
          sizeBytes: BigInt(dto.sizeBytes),
          uploadedBy: userId,
        },
      });

      return createdItem;
    });

    await this.events.publishProjectDocumentEvent(item, userId, 'CREATED');
    return this.presentation.enrichDocumentItem(item);
  }

  async createVersion(
    userId: string,
    userEmail: string,
    id: string,
    dto: CreateVersionDto,
  ): Promise<
    DocumentVersion & { uploaderProfile: UserProfileSnapshotResponse | null }
  > {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Cannot create a new version for a folder');
    }

    await this.s3Service.assertUploadSize(dto.s3Key, dto.sizeBytes, {
      actorId: userId,
      mimeType: dto.mimeType,
      target: `document:${id}`,
    });
    let nextVersionNumber = 1;

    const newVersion = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM document_items WHERE id = ${id}::uuid FOR UPDATE`;
      const duplicate = await tx.documentVersion.findFirst({
        where: { documentItemId: id, s3Key: dto.s3Key },
      });
      if (duplicate) return duplicate;
      await this.quotaService.reserve(tx, item.ownerUserId, dto.sizeBytes);
      const latestVersion = await tx.documentVersion.findFirst({
        where: { documentItemId: id },
        orderBy: { versionNumber: 'desc' },
      });
      if (!latestVersion) {
        // Retroactively create version 1 for original state
        await tx.documentVersion.create({
          data: {
            documentItemId: id,
            versionNumber: DOCUMENT_CONSTANTS.INITIAL_VERSION_NUMBER,
            s3Key: item.s3Key || DOCUMENT_CONSTANTS.FALLBACK_S3_KEY,
            sizeBytes: item.sizeBytes,
            uploadedBy: item.ownerUserId,
            createdAt: item.createdAt,
          },
        });
        nextVersionNumber = 2;
      } else {
        nextVersionNumber = latestVersion.versionNumber + 1;
      }

      // Create new version record
      const createdVersion = await tx.documentVersion.create({
        data: {
          documentItemId: id,
          versionNumber: nextVersionNumber,
          s3Key: dto.s3Key,
          sizeBytes: BigInt(dto.sizeBytes),
          uploadedBy: userId,
        },
      });

      // Update parent document item metadata to point to this latest version
      await tx.documentItem.update({
        where: { id },
        data: {
          s3Key: dto.s3Key,
          sizeBytes: BigInt(dto.sizeBytes),
          mimeType: dto.mimeType,
        },
      });

      return createdVersion;
    });

    // Update uploader storage quota

    await this.events.publishProjectDocumentEvent(item, userId, 'UPDATED');
    const [enrichedVersion] =
      await this.userProfileSnapshotService.attachProfilesToDocumentVersions([
        newVersion,
      ]);
    return enrichedVersion;
  }

  async createPublicVersion(
    id: string,
    dto: CreateVersionDto,
    userId?: string,
    userEmail?: string,
  ): Promise<Omit<DocumentVersion, 'sizeBytes'> & { sizeBytes: number }> {
    const activeUserId = userId || DOCUMENT_CONSTANTS.ANONYMOUS_USER_ID;

    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Cannot create a new version for a folder');
    }

    await this.s3Service.assertUploadSize(dto.s3Key, dto.sizeBytes, {
      actorId: activeUserId,
      publicDocumentId: id,
      mimeType: dto.mimeType,
      target: `document:${id}`,
    });
    let nextVersionNumber = DOCUMENT_CONSTANTS.INITIAL_VERSION_NUMBER;

    const newVersion = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM document_items WHERE id = ${id}::uuid FOR UPDATE`;
      const duplicate = await tx.documentVersion.findFirst({
        where: { documentItemId: id, s3Key: dto.s3Key },
      });
      if (duplicate) return duplicate;
      await this.quotaService.reserve(tx, item.ownerUserId, dto.sizeBytes);
      const latestVersion = await tx.documentVersion.findFirst({
        where: { documentItemId: id },
        orderBy: { versionNumber: 'desc' },
      });
      if (!latestVersion) {
        await tx.documentVersion.create({
          data: {
            documentItemId: id,
            versionNumber: DOCUMENT_CONSTANTS.INITIAL_VERSION_NUMBER,
            s3Key: item.s3Key || DOCUMENT_CONSTANTS.FALLBACK_S3_KEY,
            sizeBytes: item.sizeBytes,
            uploadedBy: item.ownerUserId,
            createdAt: item.createdAt,
          },
        });
        nextVersionNumber = 2;
      } else {
        nextVersionNumber = latestVersion.versionNumber + 1;
      }

      const createdVersion = await tx.documentVersion.create({
        data: {
          documentItemId: id,
          versionNumber: nextVersionNumber,
          s3Key: dto.s3Key,
          sizeBytes: BigInt(dto.sizeBytes),
          uploadedBy: activeUserId,
        },
      });

      await tx.documentItem.update({
        where: { id },
        data: {
          s3Key: dto.s3Key,
          sizeBytes: BigInt(dto.sizeBytes),
          mimeType: dto.mimeType,
        },
      });

      return createdVersion;
    });

    return {
      ...newVersion,
      sizeBytes: Number(newVersion.sizeBytes),
    };
  }

  async initiatePublicUpload(
    id: string,
    dto: InitiateUploadDto,
    userId?: string,
    userEmail?: string,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Cannot upload a file for a folder');
    }

    await this.quotaService.checkQuota(item.ownerUserId, dto.sizeBytes);

    const { presignedUrl, s3Key } =
      await this.s3Service.generatePresignedUploadUrl(
        item.ownerUserId,
        dto.name,
        dto.mimeType,
        dto.sizeBytes,
        {
          actorId: userId || DOCUMENT_CONSTANTS.ANONYMOUS_USER_ID,
          publicDocumentId: id,
        },
      );

    return { presignedUrl, s3Key };
  }
}
