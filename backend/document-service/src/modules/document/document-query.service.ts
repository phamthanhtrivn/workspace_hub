import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ItemType,
  DocumentItem,
  DocumentVersion,
  Prisma,
} from '@prisma/client';
import { DocumentRole, DocumentSortBy } from '../../common/enums/document.enum';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';
import { UserProfileSnapshotService } from '../user-profile-snapshot/user-profile-snapshot.service';
import { UserProfileSnapshotResponse } from '../user-profile-snapshot/types/user-profile-snapshot.types';
import { DocumentAccessService } from './document-access.service';
import { DocumentTreeService } from './document-tree.service';
import { DocumentPresentationService } from './document-presentation.service';

@Injectable()
export class DocumentQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userProfileSnapshotService: UserProfileSnapshotService,
    private readonly access: DocumentAccessService,
    private readonly tree: DocumentTreeService,
    private readonly presentation: DocumentPresentationService,
  ) {}
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
  ): Promise<{
    items: Array<Omit<DocumentItem, 'sizeBytes'> & { sizeBytes: number }>;
    totalCount: number;
  }> {
    const where: Prisma.DocumentItemWhereInput = {
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
      where.OR = [
        { ownerUserId: userId },
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
    } else if (options.folderId) {
      const folder = await this.access.checkPermission(
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
    const orderDirections: Prisma.DocumentItemOrderByWithRelationInput[] = [
      { type: 'asc' },
    ];
    if (options.sortBy === DocumentSortBy.OLDEST) {
      orderDirections.push({ updatedAt: 'asc' });
    } else {
      orderDirections.push({ updatedAt: 'desc' });
    }

    // 4. Pagination
    const page = options.page || 1;
    const limit = options.limit || 12;
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
      items.map(async (item) => {
        const userRole = await this.access.getPermissionRole(
          item.id,
          userId,
          userEmail,
        );

        let sizeBytes = Number(item.sizeBytes);
        let containedSizeBytes: number | undefined;
        if (item.type === ItemType.FOLDER) {
          containedSizeBytes = await this.tree.getFolderContainedSize(item.id);
          sizeBytes = containedSizeBytes;
        }

        return {
          ...item,
          sizeBytes,
          ...(containedSizeBytes !== undefined ? { containedSizeBytes } : {}),
          isStarred: item.starredBy.length > 0,
          userRole,
        };
      }),
    );

    const enrichedItems =
      await this.userProfileSnapshotService.attachProfilesToDocumentItems(
        mappedItems,
      );
    return { items: enrichedItems, totalCount };
  }

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

  async getVersions(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<
    Array<
      DocumentVersion & {
        uploadedByEmail: string;
        uploaderProfile: UserProfileSnapshotResponse | null;
      }
    >
  > {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    if (item.type === ItemType.FOLDER) {
      throw new BadRequestException('Folder has no versions');
    }

    const versions = await this.prisma.documentVersion.findMany({
      where: { documentItemId: id },
      orderBy: { versionNumber: 'desc' },
    });

    const mappedVersions: Array<DocumentVersion & { uploadedByEmail: string }> =
      versions.length === 0
        ? [
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
          ]
        : versions.map((v) => {
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
              id: v.id,
              documentItemId: v.documentItemId,
              versionNumber: v.versionNumber,
              s3Key: v.s3Key,
              sizeBytes: v.sizeBytes,
              uploadedBy: v.uploadedBy,
              createdAt: v.createdAt,
              uploadedByEmail: email,
            };
          });

    return this.userProfileSnapshotService.attachProfilesToDocumentVersions(
      mappedVersions,
    );
  }

  async getChatMetadata(
    id: string,
    userId?: string,
    userEmail?: string,
  ): Promise<{
    id: string;
    name: string;
    type: ItemType;
    sizeBytes: number;
    containedSizeBytes?: number;
    mimeType: string | null;
    ownerEmail: string;
    ownerName: string | null;
    createdAt: Date;
    hasPermission: boolean;
  }> {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    // Get folder/file size
    let sizeBytes = Number(item.sizeBytes);
    let containedSizeBytes: number | undefined;
    if (item.type === ItemType.FOLDER) {
      containedSizeBytes = await this.tree.getFolderContainedSize(item.id);
      sizeBytes = containedSizeBytes;
    }

    // Enrich with owner profile info
    const enriched = await this.presentation.enrichDocumentItem(item);
    const ownerName = enriched.ownerProfile?.fullName ?? null;

    return {
      id: item.id,
      name: item.name,
      type: item.type,
      sizeBytes,
      ...(containedSizeBytes !== undefined ? { containedSizeBytes } : {}),
      mimeType: item.mimeType,
      ownerEmail: item.ownerEmail,
      ownerName,
      createdAt: item.createdAt,
      hasPermission: true,
    };
  }

  async getFolderAncestors(
    userId: string,
    userEmail: string,
    id: string,
  ): Promise<{ id: string; name: string }[]> {
    await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    const breadcrumbs: { id: string; name: string }[] = [];
    let currentId: string | null = id;
    let iterations = 0;
    const maxIterations = 50;

    while (currentId && iterations < maxIterations) {
      const item: Pick<DocumentItem, 'id' | 'name' | 'parentFolderId'> | null =
        await this.prisma.documentItem.findUnique({
          where: { id: currentId },
          select: { id: true, name: true, parentFolderId: true },
        });

      if (!item) {
        break;
      }

      breadcrumbs.unshift({ id: item.id, name: item.name });
      currentId = item.parentFolderId;
      iterations++;
    }

    return breadcrumbs;
  }
}
