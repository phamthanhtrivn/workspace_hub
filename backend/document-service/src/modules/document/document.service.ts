import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
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
        throw new BadRequestException('Mục cha phải là thư mục');
      }
      if (parentFolder.isArchived) {
        throw new BadRequestException(
          'Không thể tải lên tệp tin trong một thư mục đã lưu trữ/xóa tạm',
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
        throw new BadRequestException('Mục cha phải là thư mục');
      }
      if (parentFolder.isArchived) {
        throw new BadRequestException(
          'Không thể lưu tài liệu trong một thư mục đã lưu trữ/xóa tạm',
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
      throw new NotFoundException('Không tìm thấy tài liệu hoặc thư mục');
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
          'Chỉ chủ sở hữu mới có quyền thực hiện hành động này',
        );
      }
      if (
        requiredRole === DocumentRole.EDITOR &&
        share.permission !== SharePermission.EDITOR
      ) {
        throw new ForbiddenException(
          'Bạn không có quyền chỉnh sửa tài liệu này',
        );
      }
      return item;
    }

    // 3. Check public link sharing if enabled
    if (item.linkAccess !== LinkAccess.NONE) {
      if (requiredRole === DocumentRole.OWNER) {
        throw new ForbiddenException(
          'Chỉ chủ sở hữu mới có quyền thực hiện hành động này',
        );
      }
      if (
        requiredRole === DocumentRole.EDITOR &&
        item.linkAccess !== LinkAccess.EDITOR
      ) {
        throw new ForbiddenException(
          'Tài liệu chỉ cho phép xem thông qua liên kết',
        );
      }
      // Check link expiration
      if (item.shareExpiresAt && new Date() > item.shareExpiresAt) {
        throw new ForbiddenException('Liên kết chia sẻ đã hết hạn');
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

    throw new ForbiddenException('Bạn không có quyền truy cập tài nguyên này');
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
        throw new BadRequestException('Mục cha phải là thư mục');
      }
      if (parentFolder.isArchived) {
        throw new BadRequestException(
          'Không thể tạo thư mục trong một thư mục đã lưu trữ/xóa tạm',
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
      where.ownerUserId = userId;
      where.isStarred = true;
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
        throw new BadRequestException('ID cung cấp không phải là thư mục');
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
        orderBy: orderDirections,
        skip,
        take: limit,
      }),
      this.prisma.documentItem.count({ where }),
    ]);

    return { items, totalCount };
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
      DocumentRole.EDITOR,
    );

    let destProjectId: string | null = null;

    if (dto.parentFolderId) {
      if (item.type === ItemType.FOLDER) {
        // Prevent cyclic reference
        const circular = await this.isDescendant(dto.parentFolderId, id);
        if (circular) {
          throw new BadRequestException(
            'Không thể di chuyển thư mục vào chính nó hoặc thư mục con của nó',
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
        throw new BadRequestException('Thư mục đích phải là thư mục');
      }
      if (destFolder.isArchived) {
        throw new BadRequestException(
          'Không thể di chuyển vào thư mục đã lưu trữ/xóa tạm',
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
    await this.checkPermission(id, userId, userEmail, DocumentRole.EDITOR);

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
  ): Promise<DocumentItem> {
    await this.checkPermission(id, userId, userEmail, DocumentRole.VIEWER);

    return this.prisma.documentItem.update({
      where: { id },
      data: { isStarred },
    });
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
      DocumentRole.EDITOR,
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
      throw new BadRequestException('Không thể xem trước thư mục');
    }

    let s3Key = item.s3Key;

    if (versionId) {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId, documentItemId: id },
      });
      if (!version) {
        throw new NotFoundException('Không tìm thấy phiên bản tài liệu');
      }
      s3Key = version.s3Key;
    }

    if (!s3Key) {
      throw new BadRequestException('Tài liệu không có tệp tin đính kèm');
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
      throw new BadRequestException('Không thể tải thư mục trực tiếp');
    }

    let s3Key = item.s3Key;
    let fileName = item.name;

    if (versionId) {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId, documentItemId: id },
      });
      if (!version) {
        throw new NotFoundException('Không tìm thấy phiên bản tài liệu');
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
      throw new BadRequestException('Tài liệu không có tệp tin đính kèm');
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
      throw new BadRequestException('Thư mục không có phiên bản');
    }

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentItemId: id },
      orderBy: { versionNumber: 'desc' },
    });

    if (versions.length === 0) {
      return [
        {
          id: 'original',
          documentItemId: item.id,
          versionNumber: 1,
          s3Key: item.s3Key || '',
          sizeBytes: item.sizeBytes,
          uploadedBy: item.ownerUserId,
          uploadedByEmail: item.ownerEmail,
          createdAt: item.createdAt,
        },
      ];
    }

    return versions.map((v) => {
      let email = 'Người dùng khác';
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
      throw new BadRequestException('Không thể tạo phiên bản mới cho thư mục');
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
            versionNumber: 1,
            s3Key: item.s3Key || '',
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
    await this.checkPermission(id, userId, userEmail, DocumentRole.EDITOR);

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
      DocumentRole.EDITOR,
    );

    if (shareEmail.toLowerCase() === item.ownerEmail.toLowerCase()) {
      throw new BadRequestException(
        'Không thể chia sẻ với chủ sở hữu tài nguyên',
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
    await this.checkPermission(id, userId, userEmail, DocumentRole.EDITOR);

    const share = await this.prisma.documentShare.findUnique({
      where: { id: shareId },
    });

    if (!share || share.documentItemId !== id) {
      throw new NotFoundException('Không tìm thấy cấu hình chia sẻ');
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
}
