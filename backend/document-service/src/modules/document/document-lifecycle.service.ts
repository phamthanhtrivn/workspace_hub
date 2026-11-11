import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageCleanupService } from './storage-cleanup.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { ItemType, DocumentItem, Prisma } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { DocumentLocationService } from './document-location.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentPresentationService } from './document-presentation.service';
import { DocumentAccessService } from './document-access.service';
import { DocumentTreeService } from './document-tree.service';
import { DOCUMENT_BULK } from './types/document-bulk.constants';
import { setDocumentTreesStarred } from './document-star-tree';
import { DocumentAccessRealtimePublisher } from './document-access-realtime.publisher';

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
    private readonly accessRealtime: DocumentAccessRealtimePublisher,
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
      await this.locations.lockWritableParent(tx, parentFolder?.id ?? null);
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
      item.isStarred,
    );

    const updated = await this.prisma.documentItem.update({
      where: { id },
      data: { name: normalizedName },
    });
    await this.events.publishProjectDocumentEvent(updated, userId, 'UPDATED');

    return this.presentation.enrichDocumentItem(updated);
  }

  async prepareMove(
    userId: string,
    userEmail: string,
    id: string,
    dto: MoveItemDto,
  ) {
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
    let destIsStarred = item.isStarred;

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
      destIsStarred = destFolder.isStarred;
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
    if (!item.projectId && Boolean(item.isStarred) !== Boolean(destIsStarred)) {
      throw new BadRequestException(DOCUMENT_BULK.CROSS_REGION_MOVE);
    }

    await this.locations.assertNoActiveSiblingWithName(
      item.ownerUserId,
      item.name,
      destParentFolderId,
      destProjectId,
      id,
      item.isStarred,
    );

    return { item, destParentFolderId, destProjectId };
  }

  async moveItem(
    userId: string,
    userEmail: string,
    id: string,
    dto: MoveItemDto,
  ): Promise<DocumentItem> {
    const { item, destParentFolderId, destProjectId } = await this.prepareMove(
      userId,
      userEmail,
      id,
      dto,
    );
    const updated = await this.prisma.$transaction(async (tx) => {
      await this.assertMoveRegion(tx, id, destParentFolderId);
      await this.locations.lockAvailableName(
        tx,
        item.ownerUserId,
        item.name,
        destParentFolderId,
        destProjectId,
        [id],
        item.isStarred,
      );

      return tx.documentItem.update({
        where: { id },
        data: { parentFolderId: destParentFolderId, projectId: destProjectId },
      });
    });
    await this.events.publishProjectDocumentEvent(updated, userId, 'UPDATED');
    await this.accessRealtime.publishForItem(id);
    if (item.projectId && item.projectId !== updated.projectId) {
      await this.events.publishProjectDocumentEvent(item, userId, 'DELETED');
    }

    return this.presentation.enrichDocumentItem(updated);
  }

  async assertMoveRegion(
    tx: Prisma.TransactionClient,
    id: string,
    parentId: string | null,
  ) {
    await this.tree.lockDocumentTree(tx, id);
    if (parentId)
      await tx.$queryRaw`SELECT id FROM document_items WHERE id = ${parentId}::uuid FOR UPDATE`;
    const source = await tx.documentItem.findUniqueOrThrow({ where: { id } });
    const destination = parentId
      ? await tx.documentItem.findUniqueOrThrow({ where: { id: parentId } })
      : null;
    if (source.isArchived || destination?.isArchived)
      throw new BadRequestException(DOCUMENT_BULK.ACTIVE_REQUIRED);
    if (
      !source.projectId &&
      destination &&
      Boolean(source.isStarred) !== Boolean(destination.isStarred)
    ) {
      throw new BadRequestException(DOCUMENT_BULK.CROSS_REGION_MOVE);
    }
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
        item.isStarred,
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
    await this.accessRealtime.publishForItem(id);

    return this.presentation.enrichDocumentItem(updated);
  }

  async toggleStar(
    userId: string,
    userEmail: string,
    id: string,
    isStarred: boolean,
  ) {
    const item = await this.access.checkPersonalOwnerFeature(
      id,
      userId,
      userEmail,
      'Star is',
    );
    await this.prisma.$transaction(
      (tx) => this.setStarredTreesInTransaction(tx, userId, [item], isStarred),
      { timeout: DOCUMENT_BULK.TRANSACTION_TIMEOUT_MS },
    );
    const updatedItem = await this.prisma.documentItem.findUniqueOrThrow({
      where: { id },
    });

    await this.events.publishProjectDocumentEvent(
      updatedItem,
      userId,
      'UPDATED',
    );

    return {
      ...updatedItem,
      sizeBytes: Number(item.sizeBytes),
      isStarred,
    };
  }

  setStarredTreesInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    items: DocumentItem[],
    isStarred: boolean,
  ) {
    return setDocumentTreesStarred(
      tx,
      this.tree,
      this.locations,
      userId,
      items,
      isStarred,
    );
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

    await this.prisma.$transaction((tx) =>
      this.deleteTreesInTransaction(tx, [id]),
    );

    await this.events.publishProjectDocumentEvent(item, userId, 'DELETED');
  }

  async deleteTreesInTransaction(
    tx: Prisma.TransactionClient,
    rootIds: string[],
  ): Promise<void> {
    const lockedIds = new Set<string>();
    for (const rootId of [...rootIds].sort()) {
      const descendants = await this.tree.lockDocumentTree(tx, rootId);
      descendants.forEach((id) => lockedIds.add(id));
    }
    const allItemIds = [...lockedIds];
    const files = await tx.documentItem.findMany({
      where: { id: { in: allItemIds }, type: ItemType.FILE },
      include: { versions: true },
    });
    const reclaimed = new Map<string, bigint>();
    const keys: string[] = [];
    for (const file of files) {
      const versions: Array<{ s3Key: string | null; sizeBytes: bigint }> = file
        .versions.length
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
      item.isStarred,
    );

    return this.prisma.documentItem.update({
      where: { id },
      data: { name: normalizedName },
    });
  }
}
