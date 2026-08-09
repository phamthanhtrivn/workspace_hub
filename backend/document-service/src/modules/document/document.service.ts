import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import * as archiver from 'archiver';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { InitiateUploadDto } from './dto/initiate-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { CreateVersionDto } from './dto/create-version.dto';
import {
  ItemType,
  DocumentItem,
  DocumentVersion,
  SharePermission,
  LinkAccess,
  DocumentShare,
} from '@prisma/client';
import { DocumentRole, DocumentSortBy } from '../../common/enums/document.enum';
import { QuotaService } from '../quota/quota.service';
import { S3Service } from '../../infrastructure/s3/s3.service';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotaService: QuotaService,
    private readonly s3Service: S3Service,
  ) {}

  async initiateUpload(
    userId: string,
    userEmail: string,
    dto: InitiateUploadDto,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    let parentFolder: DocumentItem | null = null;

    if (dto.parentFolderId) {
      parentFolder = await this.checkPermission(
        dto.parentFolderId,
        userId,
        userEmail,
        DocumentRole.EDITOR,
      );
      if (parentFolder.type !== ItemType.FOLDER) {
        throw new BadRequestException('Parent item must be a folder');
      }
      if (parentFolder.isArchived) {
        throw new BadRequestException(
          'Cannot upload files into an archived or trashed folder',
        );
      }
    }

    // Check storage quota
    await this.quotaService.checkQuota(userId, dto.sizeBytes);

    const { presignedUrl, s3Key } =
      await this.s3Service.generatePresignedUploadUrl(
        userId,
        dto.name,
        dto.mimeType,
      );

    return { presignedUrl, s3Key };
  }

  async confirmUpload(
    userId: string,
    userEmail: string,
    dto: ConfirmUploadDto,
  ): Promise<DocumentItem> {
    let parentFolder: DocumentItem | null = null;

    if (dto.parentFolderId) {
      parentFolder = await this.checkPermission(
        dto.parentFolderId,
        userId,
        userEmail,
        DocumentRole.EDITOR,
      );
      if (parentFolder.type !== ItemType.FOLDER) {
        throw new BadRequestException('Parent item must be a folder');
      }
      if (parentFolder.isArchived) {
        throw new BadRequestException(
          'Cannot save documents into an archived or trashed folder',
        );
      }
    }

    // Double check quota
    await this.quotaService.checkQuota(userId, dto.sizeBytes);

    const projectId = dto.projectId || parentFolder?.projectId || null;

    // Create DocumentItem and first Version in Database
    const item = await this.prisma.$transaction(async (tx) => {
      const createdItem = await tx.documentItem.create({
        data: {
          name: dto.name,
          type: ItemType.FILE,
          ownerUserId: userId,
          ownerEmail: userEmail,
          parentFolderId: dto.parentFolderId || null,
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

    // Update storage quota (add to usedBytes)
    await this.quotaService.updateUsedBytes(userId, dto.sizeBytes);

    return item;
  }

  /**
   * Recursively checks if a user has permission to access an item.
   * If permission is not found on the item itself, it traverses up to the parent folder.
   */
  async checkPermission(
    itemId: string,
    userId?: string,
    userEmail?: string,
    requiredRole: DocumentRole = DocumentRole.VIEWER,
  ): Promise<DocumentItem & { shares: DocumentShare[] }> {
    const item = await this.prisma.documentItem.findUnique({
      where: { id: itemId },
      include: {
        shares: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Document or folder not found');
    }

    // 1. Owner always has full access
    if (userId && item.ownerUserId === userId) {
      return item;
    }

    // 2. Check if shared explicitly with this user/email
    const share = item.shares.find(
      (s) =>
        (userId && s.shareWithUserId === userId) ||
        (userEmail &&
          s.shareWithEmail.toLowerCase() === userEmail.toLowerCase()),
    );

    if (share) {
      if (requiredRole === DocumentRole.OWNER) {
        throw new ForbiddenException(
          'Only the owner can perform this action',
        );
      }
      if (
        requiredRole === DocumentRole.EDITOR &&
        share.permission !== SharePermission.EDITOR
      ) {
        throw new ForbiddenException(
          'You are not allowed to edit this document',
        );
      }
      return item;
    }

    // 3. Check public link sharing if enabled
    if (item.linkAccess !== LinkAccess.NONE) {
      if (requiredRole === DocumentRole.OWNER) {
        throw new ForbiddenException(
          'Only the owner can perform this action',
        );
      }
      if (
        requiredRole === DocumentRole.EDITOR &&
        item.linkAccess !== LinkAccess.EDITOR
      ) {
        throw new ForbiddenException(
          'This document can only be viewed through a link',
        );
      }
      // Check link expiration
      if (item.shareExpiresAt && new Date() > item.shareExpiresAt) {
        throw new ForbiddenException('Share link has expired');
      }
      return item;
    }

    // 4. Fallback: Check parent folder recursively (inheritance)
    if (item.parentFolderId) {
      return this.checkPermission(
        item.parentFolderId,
        userId,
        userEmail,
        requiredRole,
      );
    }

    throw new ForbiddenException('You are not allowed to access this item');
  }

  /**
   * Checks recursively if possibleDescendantId is a child of possibleAncestorId.
   * Useful to prevent cyclic graphs (e.g. moving a folder into its own subfolder).
   */
  async isDescendant(
    descendantId: string,
    ancestorId: string,
  ): Promise<boolean> {
    if (descendantId === ancestorId) {
      return true;
    }
    const item = await this.prisma.documentItem.findUnique({
      where: { id: descendantId },
      select: { parentFolderId: true },
    });
    if (!item || !item.parentFolderId) {
      return false;
    }
    return this.isDescendant(item.parentFolderId, ancestorId);
  }

  /**
   * Creates a folder.
   */
  async createFolder(
    userId: string,
    userEmail: string,
    dto: CreateFolderDto,
  ): Promise<DocumentItem> {
    let parentFolder: DocumentItem | null = null;

    if (dto.parentFolderId) {
      parentFolder = await this.checkPermission(
        dto.parentFolderId,
        userId,
        userEmail,
        DocumentRole.EDITOR,
      );
      if (parentFolder.type !== ItemType.FOLDER) {
        throw new BadRequestException('Parent item must be a folder');
      }
      if (parentFolder.isArchived) {
        throw new BadRequestException(
          'Cannot create folders inside an archived or trashed folder',
        );
      }
    }

    // Inherit project ID from parent if not specified
    const projectId = dto.projectId || parentFolder?.projectId || null;

    return this.prisma.documentItem.create({
      data: {
        name: dto.name,
        type: ItemType.FOLDER,
        ownerUserId: userId,
        ownerEmail: userEmail,
        parentFolderId: dto.parentFolderId || null,
        projectId,
        sizeBytes: BigInt(0),
      },
    });
  }

  /**
   * Retrieves files and folders based on filtering options.
   */
  async getItems(
    userId: string,
    userEmail: string,
    options: {
      folderId?: string;
      isStarredOnly?: boolean;
      isArchived?: boolean;
      projectId?: string;
      isSharedOnly?: boolean;
      page?: number;
      limit?: number;
      sortBy?: DocumentSortBy;
      search?: string;
    },
  ): Promise<{ items: DocumentItem[]; totalCount: number }> {
    const where: any = {
      isArchived: options.isArchived ?? false,
    };

    // 1. Filter by search query if provided
    if (options.search) {
      where.name = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    // 2. Filter by view context
    if (options.isSharedOnly) {
      where.ownerUserId = { not: userId };
      where.OR = [
        {
          shares: {
            some: {
              OR: [
                { shareWithUserId: userId },
                { shareWithEmail: { equals: userEmail, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    } else if (options.isArchived) {
      where.ownerUserId = userId;
    } else if (options.isStarredOnly) {
      where.starredBy = {
        some: { userId },
      };
    } else if (options.projectId) {
      where.projectId = options.projectId;
      where.parentFolderId = null;
    } else if (options.folderId) {
      const folder = await this.checkPermission(
        options.folderId,
        userId,
        userEmail,
        DocumentRole.VIEWER,
      );
      if (folder.type !== ItemType.FOLDER) {
        throw new BadRequestException('The provided ID is not a folder');
      }
      where.parentFolderId = options.folderId;
    } else {
      where.ownerUserId = userId;
      where.parentFolderId = null;
      where.projectId = null;
    }

    // 3. Sorting (folders first, then sortBy)
    const orderDirections: any[] = [{ type: 'asc' }];
    if (options.sortBy === DocumentSortBy.OLDEST) {
      orderDirections.push({ updatedAt: 'asc' });
    } else {
      orderDirections.push({ updatedAt: 'desc' });
    }

    // 4. Pagination
    const page = options.page || 1;
    const limit = options.limit || 8;
    const skip = (page - 1) * limit;

    const [items, totalCount] = await Promise.all([
      this.prisma.documentItem.findMany({
        where,
        include: {
          shares: true,
          starredBy: {
            where: { userId },
          },
        },
        orderBy: orderDirections,
        skip,
        take: limit,
      }),
      this.prisma.documentItem.count({ where }),
    ]);

    const mappedItems = await Promise.all(
      items.map(async (item: any) => {
        let userRole: DocumentRole = DocumentRole.VIEWER;
        if (item.ownerUserId === userId) {
          userRole = DocumentRole.OWNER;
        } else {
          const share = item.shares?.find(
            (s: any) =>
              (userId && s.shareWithUserId === userId) ||
              (userEmail &&
                s.shareWithEmail.toLowerCase() === userEmail.toLowerCase()),
          );
          if (share) {
            userRole = share.permission as DocumentRole;
          } else if (item.linkAccess !== LinkAccess.NONE) {
            userRole = item.linkAccess as DocumentRole;
          }
        }

        let sizeBytes = Number(item.sizeBytes);
        if (item.type === ItemType.FOLDER) {
          sizeBytes = await this.getFolderSize(item.id);
        }

        return {
          ...item,
          sizeBytes,
          isStarred: item.starredBy.length > 0,
          userRole,
        };
      }),
    );

    return { items: mappedItems, totalCount };
  }

  /**
   * Get files shared with the user
   */
  async getSharedWithMe(
    userId: string,
    userEmail: string,
  ): Promise<DocumentItem[]> {
    return this.prisma.documentItem.findMany({
      where: {
        isArchived: false,
        OR: [
          {
            shares: {
              some: {
                OR: [
                  { shareWithUserId: userId },
                  {
                    shareWithEmail: { equals: userEmail, mode: 'insensitive' },
                  },
                ],
              },
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Renames a folder or file.
   */
  async renameItem(
    userId: string,
    userEmail: string,
    id: string,
    dto: RenameItemDto,
  ): Promise<DocumentItem> {
    await this.checkPermission(id, userId, userEmail, DocumentRole.EDITOR);

    return this.prisma.documentItem.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  /**
   * Moves a folder or file to a different folder.
   */
  async moveItem(
    userId: string,
    userEmail: string,
    id: string,
    dto: MoveItemDto,
  ): Promise<DocumentItem> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.OWNER,
    );

    let destProjectId: string | null = null;

    if (dto.parentFolderId) {
      if (item.type === ItemType.FOLDER) {
        // Prevent cyclic reference
        const circular = await this.isDescendant(dto.parentFolderId, id);
        if (circular) {
          throw new BadRequestException(
            'Cannot move a folder into itself or one of its descendants',
          );
        }
      }

      const destFolder = await this.checkPermission(
        dto.parentFolderId,
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
    }

    return this.prisma.documentItem.update({
      where: { id },
      data: {
        parentFolderId: dto.parentFolderId || null,
        projectId: destProjectId,
      },
    });
  }

  /**
   * Archives (soft-deletes) or restores an item.
   */
  async archiveItem(
    userId: string,
    userEmail: string,
    id: string,
    archive: boolean,
  ): Promise<DocumentItem> {
    await this.checkPermission(id, userId, userEmail, DocumentRole.OWNER);

    return this.prisma.documentItem.update({
      where: { id },
      data: {
        isArchived: archive,
        archivedAt: archive ? new Date() : null,
      },
    });
  }

  /**
   * Star/Favorite or Unstar an item.
   */
  async toggleStar(
    userId: string,
    userEmail: string,
    id: string,
    isStarred: boolean,
  ): Promise<any> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

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

    return {
      ...item,
      sizeBytes: Number(item.sizeBytes),
      isStarred,
    };
  }

  /**
   * Recursively fetches all descendant folder IDs and file items of a folder using BFS.
   */
  private async getFolderDescendants(
    folderId: string,
  ): Promise<{ files: DocumentItem[]; folderIds: string[] }> {
    const files: DocumentItem[] = [];
    const folderIds: string[] = [folderId];
    const queue: string[] = [folderId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.prisma.documentItem.findMany({
        where: { parentFolderId: currentId },
      });

      for (const child of children) {
        if (child.type === ItemType.FOLDER) {
          folderIds.push(child.id);
          queue.push(child.id);
        } else {
          files.push(child);
        }
      }
    }

    return { files, folderIds };
  }

  /**
   * Helper to recursively sum the sizes of all files inside a folder.
   */
  private async getFolderSize(folderId: string): Promise<number> {
    const descendants = await this.getFolderDescendants(folderId);
    return descendants.files.reduce(
      (sum, file) => sum + Number(file.sizeBytes),
      0,
    );
  }

  /**
   * Deletes files from S3 client in the background without blocking execution thread.
   */
  private async deleteS3ObjectsBackground(s3Keys: string[]): Promise<void> {
    for (const key of s3Keys) {
      try {
        await this.s3Service.deleteFile(key);
      } catch (error) {
        console.error(`Background S3 deletion failed for key ${key}:`, error);
      }
    }
  }

  /**
   * Permanently deletes a file or folder. Reclaims storage quota immediately,
   * deletes database records, and triggers S3 physical file deletes in the background.
   */
  async deleteItemPermanently(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<void> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.OWNER,
    );

    let filesToDelete: DocumentItem[] = [];
    let folderIdsToDelete: string[] = [];

    if (item.type === ItemType.FOLDER) {
      const descendants = await this.getFolderDescendants(id);
      filesToDelete = descendants.files;
      folderIdsToDelete = descendants.folderIds;
    } else {
      filesToDelete = [item];
    }

    // Sum storage size of files being permanently deleted
    const totalSizeReclaimed = filesToDelete.reduce(
      (sum, file) => sum + Number(file.sizeBytes),
      0,
    );

    const allItemIdsToDelete = [
      ...folderIdsToDelete,
      ...filesToDelete.map((f) => f.id),
    ];

    // Database deletion transaction
    await this.prisma.$transaction([
      this.prisma.documentItem.deleteMany({
        where: { id: { in: allItemIdsToDelete } },
      }),
      this.prisma.userStorageQuota.update({
        where: { userId },
        data: {
          usedBytes: {
            decrement: totalSizeReclaimed,
          },
        },
      }),
    ]);

    // Background S3 deletions
    const s3Keys = filesToDelete
      .map((f) => f.s3Key)
      .filter((key): key is string => !!key);

    if (s3Keys.length > 0) {
      this.deleteS3ObjectsBackground(s3Keys).catch((err) => {
        console.error(
          `Failed to handle S3 deletions background execution:`,
          err,
        );
      });
    }
  }

  /**
   * Generates a temporary S3 read presigned URL for previewing files.
   */
  async getPreviewUrl(
    userId: string | undefined,
    userEmail: string | undefined,
    id: string,
    versionId?: string,
  ): Promise<string> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Folders cannot be previewed');
    }

    let s3Key = item.s3Key;

    if (versionId) {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId, documentItemId: id },
      });
      if (!version) {
        throw new NotFoundException('Document version not found');
      }
      s3Key = version.s3Key;
    }

    if (!s3Key) {
      throw new BadRequestException('Document has no attached file');
    }

    return this.s3Service.generatePresignedDownloadUrl(s3Key);
  }

  /**
   * Generates a temporary S3 download presigned URL with correct content disposition headers.
   */
  async getDownloadUrl(
    userId: string | undefined,
    userEmail: string | undefined,
    id: string,
    versionId?: string,
  ): Promise<string> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Folders cannot be downloaded directly');
    }

    let s3Key = item.s3Key;
    let fileName = item.name;

    if (versionId) {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId, documentItemId: id },
      });
      if (!version) {
        throw new NotFoundException('Document version not found');
      }
      s3Key = version.s3Key;
      const dotIndex = fileName.lastIndexOf('.');
      if (dotIndex !== -1) {
        fileName = `${fileName.substring(0, dotIndex)}_v${version.versionNumber}${fileName.substring(dotIndex)}`;
      } else {
        fileName = `${fileName}_v${version.versionNumber}`;
      }
    }

    if (!s3Key) {
      throw new BadRequestException('Document has no attached file');
    }

    return this.s3Service.generatePresignedDownloadUrl(s3Key, fileName);
  }

  /**
   * Retrieves the version history of a document item.
   */
  async getVersions(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<any[]> {
    const item = (await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    )) as any;

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Folder has no versions');
    }

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentItemId: id },
      orderBy: { versionNumber: 'desc' },
    });

    if (versions.length === 0) {
      return [
        {
          id: DOCUMENT_CONSTANTS.ORIGINAL_VERSION_ID,
          documentItemId: item.id,
          versionNumber: DOCUMENT_CONSTANTS.INITIAL_VERSION_NUMBER,
          s3Key: item.s3Key || DOCUMENT_CONSTANTS.FALLBACK_S3_KEY,
          sizeBytes: item.sizeBytes,
          uploadedBy: item.ownerUserId,
          uploadedByEmail: item.ownerEmail,
          createdAt: item.createdAt,
        },
      ];
    }

    return versions.map((v) => {
      let email = DOCUMENT_CONSTANTS.FALLBACK_UPLOADER_EMAIL_PRIVATE;
      if (v.uploadedBy === item.ownerUserId) {
        email = item.ownerEmail;
      } else {
        const share = item.shares?.find(
          (s) => s.shareWithUserId === v.uploadedBy,
        );
        if (share) {
          email = share.shareWithEmail;
        }
      }
      return {
        ...v,
        uploadedByEmail: email,
      };
    });
  }

  /**
   * Uploads a new version of an existing document.
   */
  async createVersion(
    userId: string,
    userEmail: string,
    id: string,
    dto: CreateVersionDto,
  ): Promise<DocumentVersion> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Cannot create a new version for a folder');
    }

    // Check storage quota
    await this.quotaService.checkQuota(userId, dto.sizeBytes);

    const latestVersion = await this.prisma.documentVersion.findFirst({
      where: { documentItemId: id },
      orderBy: { versionNumber: 'desc' },
    });

    let nextVersionNumber = 1;

    const newVersion = await this.prisma.$transaction(async (tx) => {
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
    await this.quotaService.updateUsedBytes(userId, dto.sizeBytes);

    return newVersion;
  }

  /**
   * Get sharing settings of a document.
   */
  async getSharing(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<{ linkAccess: LinkAccess; shares: DocumentShare[] }> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );
    const shares = await this.prisma.documentShare.findMany({
      where: { documentItemId: id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      linkAccess: item.linkAccess,
      shares,
    };
  }

  /**
   * Update general link access configuration of a document.
   */
  async updateLinkAccess(
    userId: string,
    userEmail: string,
    id: string,
    linkAccess: LinkAccess,
  ): Promise<DocumentItem> {
    await this.checkPermission(id, userId, userEmail, DocumentRole.OWNER);

    return this.prisma.documentItem.update({
      where: { id },
      data: { linkAccess },
    });
  }

  /**
   * Add or update explicit share permission for an email.
   */
  async addShare(
    userId: string,
    userEmail: string,
    id: string,
    shareEmail: string,
    permission: SharePermission,
  ): Promise<DocumentShare> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.OWNER,
    );

    if (shareEmail.toLowerCase() === item.ownerEmail.toLowerCase()) {
      throw new BadRequestException(
        'Cannot share an item with its owner',
      );
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

    return share;
  }

  /**
   * Remove explicit share permission by share ID.
   */
  async removeShare(
    userId: string,
    userEmail: string,
    id: string,
    shareId: string,
  ): Promise<void> {
    await this.checkPermission(id, userId, userEmail, DocumentRole.OWNER);

    const share = await this.prisma.documentShare.findUnique({
      where: { id: shareId },
    });

    if (!share || share.documentItemId !== id) {
      throw new NotFoundException('Share configuration not found');
    }

    await this.prisma.documentShare.delete({
      where: { id: shareId },
    });
  }

  /**
   * Fetch public/shared metadata of a document.
   */
  async getPublicDocument(
    id: string,
    userId?: string,
    userEmail?: string,
  ): Promise<{
    item: {
      id: string;
      name: string;
      type: ItemType;
      sizeBytes: number;
      mimeType: string | null;
      ownerEmail: string;
      createdAt: Date;
      linkAccess: LinkAccess;
    };
    userRole: DocumentRole;
  }> {
    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    // Determine current user's role
    let userRole: DocumentRole = DocumentRole.VIEWER;
    if (userId && item.ownerUserId === userId) {
      userRole = DocumentRole.OWNER;
    } else {
      const share = item.shares?.find(
        (s: DocumentShare) =>
          (userId && s.shareWithUserId === userId) ||
          (userEmail &&
            s.shareWithEmail.toLowerCase() === userEmail.toLowerCase()),
      );
      if (share) {
        userRole = share.permission as DocumentRole;
      } else if (item.linkAccess !== LinkAccess.NONE) {
        userRole = item.linkAccess as DocumentRole;
      }
    }

    return {
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        sizeBytes: Number(item.sizeBytes),
        mimeType: item.mimeType,
        ownerEmail: item.ownerEmail,
        createdAt: item.createdAt,
        linkAccess: item.linkAccess,
      },
      userRole,
    };
  }

  async getPublicVersions(
    id: string,
    userId?: string,
    userEmail?: string,
  ): Promise<any[]> {
    const item = (await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    )) as any;

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Folder has no versions');
    }

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentItemId: id },
      orderBy: { versionNumber: 'desc' },
    });

    if (versions.length === 0) {
      return [
        {
          id: DOCUMENT_CONSTANTS.ORIGINAL_VERSION_ID,
          documentItemId: item.id,
          versionNumber: DOCUMENT_CONSTANTS.INITIAL_VERSION_NUMBER,
          s3Key: item.s3Key || DOCUMENT_CONSTANTS.FALLBACK_S3_KEY,
          sizeBytes: Number(item.sizeBytes),
          uploadedBy: item.ownerUserId,
          uploadedByEmail: item.ownerEmail,
          createdAt: item.createdAt,
        },
      ];
    }

    return versions.map((v) => {
      let email = DOCUMENT_CONSTANTS.FALLBACK_UPLOADER_EMAIL_PUBLIC;
      if (v.uploadedBy === item.ownerUserId) {
        email = item.ownerEmail;
      } else {
        const share = item.shares?.find(
          (s: any) => s.shareWithUserId === v.uploadedBy,
        );
        if (share) {
          email = share.shareWithEmail;
        }
      }
      return {
        ...v,
        sizeBytes: Number(v.sizeBytes),
        uploadedByEmail: email,
      };
    });
  }

  async createPublicVersion(
    id: string,
    dto: CreateVersionDto,
    userId?: string,
    userEmail?: string,
  ): Promise<DocumentVersion> {
    const activeUserId = userId || DOCUMENT_CONSTANTS.ANONYMOUS_USER_ID;

    const item = await this.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Cannot create a new version for a folder');
    }

    // Check storage quota of the Owner
    await this.quotaService.checkQuota(item.ownerUserId, dto.sizeBytes);

    const latestVersion = await this.prisma.documentVersion.findFirst({
      where: { documentItemId: id },
      orderBy: { versionNumber: 'desc' },
    });

    let nextVersionNumber = DOCUMENT_CONSTANTS.INITIAL_VERSION_NUMBER;

    const newVersion = await this.prisma.$transaction(async (tx) => {
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

    await this.quotaService.updateUsedBytes(item.ownerUserId, dto.sizeBytes);

    return {
      ...newVersion,
      sizeBytes: Number(newVersion.sizeBytes),
    } as any;
  }

  async renamePublicItem(
    id: string,
    dto: RenameItemDto,
    userId?: string,
    userEmail?: string,
  ): Promise<DocumentItem> {
    await this.checkPermission(id, userId, userEmail, DocumentRole.EDITOR);

    return this.prisma.documentItem.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  async initiatePublicUpload(
    id: string,
    dto: InitiateUploadDto,
    userId?: string,
    userEmail?: string,
  ): Promise<{ presignedUrl: string; s3Key: string }> {
    const item = await this.checkPermission(
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
      );

    return { presignedUrl, s3Key };
  }

  /**
   * Streams all files in a folder (recursively) as a ZIP archive to the HTTP response.
   * Uses archiver library to pipe S3 streams directly into the ZIP without disk writes.
   */
  async downloadFolderAsZip(
    userId: string | undefined,
    userEmail: string | undefined,
    folderId: string,
    res: Response,
  ): Promise<void> {
    const folder = await this.checkPermission(
      folderId,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    if (folder.type !== ItemType.FOLDER) {
      throw new BadRequestException('This item is not a folder');
    }

    const { files, pathMap } = await this.getFolderDescendantsWithPaths(
      folderId,
      folder.name,
    );

    const folderName = folder.name.replace(
      DOCUMENT_CONSTANTS.REGEX_INVALID_FILENAME_CHARS,
      '_',
    );
    const asciiName = folderName
      .normalize('NFD')
      .replace(DOCUMENT_CONSTANTS.REGEX_DIACRITICS, '')
      .replace(DOCUMENT_CONSTANTS.REGEX_NON_ASCII, '_');
    const encodedName = encodeURIComponent(`${folder.name}.zip`).replace(
      DOCUMENT_CONSTANTS.REGEX_SINGLE_QUOTE,
      DOCUMENT_CONSTANTS.PERCENT_ENCODED_SINGLE_QUOTE,
    );

    res.setHeader('Content-Type', DOCUMENT_CONSTANTS.ZIP_CONTENT_TYPE);
    res.setHeader(
      'Content-Disposition',
      `${DOCUMENT_CONSTANTS.ZIP_CONTENT_DISPOSITION_PREFIX}; filename="${asciiName}.zip"; filename*=UTF-8''${encodedName}`,
    );
    res.setHeader('Transfer-Encoding', 'chunked');

    const archive = new archiver.ZipArchive({
      zlib: { level: DOCUMENT_CONSTANTS.ZIP_COMPRESSION_LEVEL },
    });
    archive.pipe(res);

    for (const file of files) {
      if (!file.s3Key) continue;
      try {
        const stream = await this.s3Service.getFileStream(file.s3Key);
        const filePath = pathMap.get(file.id) ?? file.name;
        archive.append(stream, { name: filePath });
      } catch (err) {
        console.error(`Skipping file ${file.id} due to S3 error:`, err);
      }
    }

    await archive.finalize();
  }

  /**
   * BFS traversal that also tracks the relative path of each file inside the ZIP.
   */
  private async getFolderDescendantsWithPaths(
    folderId: string,
    rootName: string,
  ): Promise<{ files: DocumentItem[]; pathMap: Map<string, string> }> {
    const files: DocumentItem[] = [];
    const pathMap = new Map<string, string>();
    const queue: { id: string; relativePath: string }[] = [
      { id: folderId, relativePath: rootName },
    ];

    while (queue.length > 0) {
      const { id: currentId, relativePath } = queue.shift()!;
      const children = await this.prisma.documentItem.findMany({
        where: { parentFolderId: currentId },
      });

      for (const child of children) {
        const childPath = `${relativePath}/${child.name}`;
        if (child.type === ItemType.FOLDER) {
          queue.push({ id: child.id, relativePath: childPath });
        } else {
          files.push(child);
          pathMap.set(child.id, childPath);
        }
      }
    }

    return { files, pathMap };
  }

  /**
   * Returns the direct children of a folder for the public shared folder browser.
   */
  async getPublicFolderChildren(
    rootId: string,
    folderId: string,
    userId?: string,
    userEmail?: string,
  ): Promise<DocumentItem[]> {
    // Verify the user can access the root shared item
    await this.checkPermission(rootId, userId, userEmail, DocumentRole.VIEWER);

    // Verify the requested folder is a descendant of the root item
    const isChild = await this.isDescendant(folderId, rootId);
    const isSelf = folderId === rootId;
    if (!isChild && !isSelf) {
      throw new ForbiddenException(
        'Folder does not belong to the shared item',
      );
    }

    const children = await this.prisma.documentItem.findMany({
      where: { parentFolderId: folderId, isArchived: false },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return Promise.all(
      children.map(async (item) => {
        let sizeBytes = Number(item.sizeBytes);
        if (item.type === ItemType.FOLDER) {
          sizeBytes = await this.getFolderSize(item.id);
        }
        return {
          ...item,
          sizeBytes,
        };
      }),
    ) as any;
  }
}
