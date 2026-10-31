import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageCleanupService } from './storage-cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { ItemType, DocumentItem } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { DocumentLocationService } from './document-location.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentPresentationService } from './document-presentation.service';
import { DocumentAccessService } from './document-access.service';
import { DocumentTreeService } from './document-tree.service';

@Injectable()
export class DocumentLifecycleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageCleanup: StorageCleanupService,
    private readonly locations: DocumentLocationService,
    private readonly events: DocumentEventPublisher,
    private readonly presentation: DocumentPresentationService,
    private readonly access: DocumentAccessService,
    private readonly tree: DocumentTreeService,
  ) {}
  async createFolder(
    userId: string,
    userEmail: string,
    dto: CreateFolderDto,
  ): Promise<DocumentItem> {
    const parentFolder = await this.locations.resolveWritableParentFolder(
      userId,
      userEmail,
      dto.parentFolderId,
      dto.projectId,
      'Cannot create folders inside an archived or trashed folder',
    );

    // Inherit project ID from parent if not specified
    const projectId = parentFolder?.projectId || dto.projectId || null;
    const normalizedName = this.locations.normalizeItemName(dto.name);
    const folder = await this.prisma.$transaction(async (tx) => {
      await this.locations.lockAvailableName(
        tx,
        userId,
        normalizedName,
        parentFolder?.id ?? null,
        projectId,
      );
      return tx.documentItem.create({
        data: {
          name: normalizedName,
          type: ItemType.FOLDER,
          ownerUserId: userId,
          ownerEmail: userEmail,
          parentFolderId: parentFolder?.id ?? null,
          projectId,
          sizeBytes: BigInt(0),
        },
      });
    });

    await this.events.publishProjectDocumentEvent(folder, userId, 'CREATED');
    return this.presentation.enrichDocumentItem(folder);
  }

  async renameItem(
    userId: string,
    userEmail: string,
    id: string,
    dto: RenameItemDto,
  ): Promise<DocumentItem> {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );
    const normalizedName = this.locations.normalizeItemName(dto.name);
    await this.locations.assertNoActiveSiblingWithName(
      item.ownerUserId,
      normalizedName,
      item.parentFolderId,
      item.projectId,
      id,
    );

    const updated = await this.prisma.documentItem.update({
      where: { id },
      data: { name: normalizedName },
    });
    await this.events.publishProjectDocumentEvent(updated, userId, 'UPDATED');
    return this.presentation.enrichDocumentItem(updated);
  }

  async moveItem(
    userId: string,
    userEmail: string,
    id: string,
    dto: MoveItemDto,
  ): Promise<DocumentItem> {
    const target = await this.prisma.documentItem.findUnique({
      where: { id },
      select: { projectId: true },
    });
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      target?.projectId ? DocumentRole.EDITOR : DocumentRole.OWNER,
    );
    if (item.projectId && item.parentFolderId === null) {
      throw new BadRequestException(
        'Project documents root folder cannot be moved',
      );
    }

    let destParentFolderId = dto.parentFolderId || null;
    let destProjectId: string | null = null;

    if (destParentFolderId) {
      if (item.type === ItemType.FOLDER) {
        // Prevent cyclic reference
        const circular = await this.tree.isDescendant(destParentFolderId, id);
        if (circular) {
          throw new BadRequestException(
            'Cannot move a folder into itself or one of its descendants',
          );
        }
      }

      const destFolder = await this.access.checkPermission(
        destParentFolderId,
        userId,
        userEmail,
        DocumentRole.EDITOR,
      );
      if (destFolder.type !== ItemType.FOLDER) {
        throw new BadRequestException('Destination must be a folder');
      }
      if (destFolder.isArchived) {
        throw new BadRequestException(
          'Cannot move into an archived or trashed folder',
        );
      }
      destProjectId = destFolder.projectId;
    } else if (item.projectId) {
      if (!dto.projectId || dto.projectId !== item.projectId) {
        throw new BadRequestException(
          'Project document destination must stay in the same project',
        );
      }
      const rootFolder = await this.locations.findProjectRootFolder(
        item.projectId,
      );
      await this.access.checkPermission(
        rootFolder.id,
        userId,
        userEmail,
        DocumentRole.EDITOR,
      );
      destParentFolderId = rootFolder.id;
      destProjectId = rootFolder.projectId;
    } else if (dto.projectId) {
      throw new BadRequestException(
        'Personal documents cannot be moved into project documents',
      );
    }

    if (item.projectId && destProjectId !== item.projectId) {
      throw new BadRequestException(
        'Project documents can only be moved within the same project',
      );
    }
    if (!item.projectId && destProjectId) {
      throw new BadRequestException(
        'Personal documents cannot be moved into project documents',
      );
    }

    await this.locations.assertNoActiveSiblingWithName(
      item.ownerUserId,
      item.name,
      destParentFolderId,
      destProjectId,
      id,
    );

    const updated = await this.prisma.documentItem.update({
      where: { id },
      data: {
        parentFolderId: destParentFolderId,
        projectId: destProjectId,
      },
    });
    await this.events.publishProjectDocumentEvent(updated, userId, 'UPDATED');
    if (item.projectId && item.projectId !== updated.projectId) {
      await this.events.publishProjectDocumentEvent(item, userId, 'DELETED');
    }
    return this.presentation.enrichDocumentItem(updated);
  }

  async archiveItem(
    userId: string,
    userEmail: string,
    id: string,
    archive: boolean,
  ): Promise<DocumentItem> {
    const target = await this.prisma.documentItem.findUnique({
      where: { id },
      select: { projectId: true },
    });
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      target?.projectId ? DocumentRole.EDITOR : DocumentRole.OWNER,
    );
    this.access.assertPersonalDocumentFeature(item, 'Trash is');

    if (!archive) {
      await this.locations.assertNoActiveSiblingWithName(
        item.ownerUserId,
        item.name,
        item.parentFolderId,
        item.projectId,
        id,
      );
    }

    const updated = await this.prisma.documentItem.update({
      where: { id },
      data: {
        isArchived: archive,
        archivedAt: archive ? new Date() : null,
      },
    });
    await this.events.publishProjectDocumentEvent(
      updated,
      userId,
      archive ? 'DELETED' : 'UPDATED',
    );
    return this.presentation.enrichDocumentItem(updated);
  }

  async toggleStar(
    userId: string,
    userEmail: string,
    id: string,
    isStarred: boolean,
  ) {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );
    this.access.assertPersonalDocumentFeature(item, 'Star is');

    if (isStarred) {
      await this.prisma.userStarredDocument.upsert({
        where: {
          userId_documentItemId: {
            userId,
            documentItemId: id,
          },
        },
        create: {
          userId,
          documentItemId: id,
        },
        update: {},
      });
    } else {
      await this.prisma.userStarredDocument.deleteMany({
        where: {
          userId,
          documentItemId: id,
        },
      });
    }

    await this.events.publishProjectDocumentEvent(item, userId, 'UPDATED');
    return {
      ...item,
      sizeBytes: Number(item.sizeBytes),
      isStarred,
    };
  }

  async deleteItemPermanently(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<void> {
    const target = await this.prisma.documentItem.findUnique({
      where: { id },
      select: { projectId: true },
    });
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      target?.projectId ? DocumentRole.EDITOR : DocumentRole.OWNER,
    );
    if (item.projectId && item.parentFolderId === null) {
      throw new BadRequestException(
        'Project documents root folder cannot be deleted',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const allItemIds = await this.tree.lockDocumentTree(tx, id);
      const files = await tx.documentItem.findMany({
        where: { id: { in: allItemIds }, type: ItemType.FILE },
        include: { versions: true },
      });
      const reclaimed = new Map<string, bigint>();
      const keys: string[] = [];
      for (const file of files) {
        const versions: Array<{ s3Key: string | null; sizeBytes: bigint }> =
          file.versions.length
            ? file.versions
            : [{ s3Key: file.s3Key, sizeBytes: file.sizeBytes }];
        reclaimed.set(
          file.ownerUserId,
          (reclaimed.get(file.ownerUserId) ?? 0n) +
            versions.reduce((sum, version) => sum + version.sizeBytes, 0n),
        );
        for (const version of versions)
          if (version.s3Key) keys.push(version.s3Key);
        if (file.s3Key) keys.push(file.s3Key);
      }
      const removed = await tx.documentItem.deleteMany({
        where: { id: { in: allItemIds } },
      });
      if (!removed.count) return;
      for (const [ownerId, bytes] of [...reclaimed].sort(([a], [b]) =>
        a.localeCompare(b),
      )) {
        await tx.$executeRaw`UPDATE user_storage_quotas SET used_bytes = GREATEST(0, used_bytes - ${bytes}), updated_at = NOW() WHERE user_id = ${ownerId}::uuid`;
      }
      await this.storageCleanup.enqueue(tx, keys);
    });

    await this.events.publishProjectDocumentEvent(item, userId, 'DELETED');
  }

  async renamePublicItem(
    id: string,
    dto: RenameItemDto,
    userId?: string,
    userEmail?: string,
  ): Promise<DocumentItem> {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );
    const normalizedName = this.locations.normalizeItemName(dto.name);
    await this.locations.assertNoActiveSiblingWithName(
      item.ownerUserId,
      normalizedName,
      item.parentFolderId,
      item.projectId,
      id,
    );

    return this.prisma.documentItem.update({
      where: { id },
      data: { name: normalizedName },
    });
  }
}
