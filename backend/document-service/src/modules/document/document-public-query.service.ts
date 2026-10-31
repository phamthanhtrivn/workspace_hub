import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemType, LinkAccess } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { DOCUMENT_CONSTANTS } from '../../common/constants/document.constants';
import { DocumentAccessService } from './document-access.service';
import { DocumentTreeService } from './document-tree.service';

@Injectable()
export class DocumentPublicQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly tree: DocumentTreeService,
  ) {}
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
      containedSizeBytes?: number;
      mimeType: string | null;
      ownerEmail: string;
      createdAt: Date;
      linkAccess: LinkAccess;
    };
    userRole: DocumentRole;
  }> {
    const item = await this.access.checkPermission(
      id,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    // Determine effective user role with inheritance
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
      item: {
        id: item.id,
        name: item.name,
        type: item.type,
        sizeBytes,
        ...(containedSizeBytes !== undefined ? { containedSizeBytes } : {}),
        mimeType: item.mimeType,
        ownerEmail: item.ownerEmail,
        createdAt: item.createdAt,
        linkAccess: item.linkAccess,
      },
      userRole,
    };
  }

  async getPublicVersions(id: string, userId?: string, userEmail?: string) {
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
          (s) => s.shareWithUserId === v.uploadedBy,
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

  async getPublicFolderChildren(
    rootId: string,
    folderId: string,
    userId?: string,
    userEmail?: string,
  ) {
    // Verify the user can access the root shared item
    await this.access.checkPermission(
      rootId,
      userId,
      userEmail,
      DocumentRole.VIEWER,
    );

    // Verify the requested folder is a descendant of the root item
    const isChild = await this.tree.isDescendant(folderId, rootId);
    const isSelf = folderId === rootId;
    if (!isChild && !isSelf) {
      throw new ForbiddenException('Folder does not belong to the shared item');
    }

    const children = await this.prisma.documentItem.findMany({
      where: { parentFolderId: folderId, isArchived: false },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return Promise.all(
      children.map(async (item) => {
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
        };
      }),
    );
  }
}
