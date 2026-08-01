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
import {
  ItemType,
  DocumentItem,
  SharePermission,
  LinkAccess,
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

    const { presignedUrl, s3Key } = await this.s3Service.generatePresignedUploadUrl(
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

    // Create DocumentItem in Database
    const item = await this.prisma.documentItem.create({
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
    userId: string,
    userEmail: string,
    requiredRole: DocumentRole,
  ): Promise<DocumentItem> {
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
    if (item.ownerUserId === userId) {
      return item;
    }

    // 2. Check if shared explicitly with this user/email
    const share = item.shares.find(
      (s) =>
        s.shareWithUserId === userId ||
        s.shareWithEmail.toLowerCase() === userEmail.toLowerCase(),
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

    throw new ForbiddenException('Bạn không có quyền truy cập tài liệu này');
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
}
