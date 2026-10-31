import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemType, DocumentItem, DocumentShare, Prisma } from '@prisma/client';
import { DocumentRole } from '../../common/enums/document.enum';
import { DocumentAccessService } from './document-access.service';

@Injectable()
export class DocumentLocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
  ) {}
  normalizeItemName(name: string) {
    return name.trim();
  }

  buildSiblingScopeWhere(
    ownerUserId: string,
    parentFolderId?: string | null,
    projectId?: string | null,
  ) {
    if (parentFolderId) {
      return { parentFolderId };
    }
    if (projectId) {
      return { parentFolderId: null, projectId };
    }
    return { ownerUserId, parentFolderId: null, projectId: null };
  }

  async findActiveSiblingByName(
    ownerUserId: string,
    name: string,
    parentFolderId?: string | null,
    projectId?: string | null,
    excludeId?: string,
  ) {
    const normalizedName = this.normalizeItemName(name);
    if (!normalizedName) {
      throw new BadRequestException('Name cannot be empty');
    }

    return this.prisma.documentItem.findFirst({
      where: {
        ...this.buildSiblingScopeWhere(ownerUserId, parentFolderId, projectId),
        isArchived: false,
        name: { equals: normalizedName, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        parentFolderId: true,
        projectId: true,
        ownerUserId: true,
      },
    });
  }

  throwDuplicateNameConflict(conflict: { name: string; type: ItemType }) {
    throw new ConflictException({
      message: `${conflict.type === ItemType.FOLDER ? 'A folder' : 'A file'} named "${conflict.name}" already exists in this location`,
      code: 'DOCUMENT_NAME_CONFLICT',
    });
  }

  async lockAvailableName(
    tx: Prisma.TransactionClient,
    ownerUserId: string,
    name: string,
    parentFolderId: string | null,
    projectId: string | null,
  ) {
    if (!name) throw new BadRequestException('Name cannot be empty');
    const scope = JSON.stringify(
      this.buildSiblingScopeWhere(ownerUserId, parentFolderId, projectId),
    );
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scope}, 8085))::text AS locked`;
    const conflict = await tx.documentItem.findFirst({
      where: {
        ...this.buildSiblingScopeWhere(ownerUserId, parentFolderId, projectId),
        isArchived: false,
        name: { equals: name, mode: 'insensitive' },
      },
      select: { name: true, type: true },
    });
    if (conflict) this.throwDuplicateNameConflict(conflict);
  }

  async assertNoActiveSiblingWithName(
    ownerUserId: string,
    name: string,
    parentFolderId?: string | null,
    projectId?: string | null,
    excludeId?: string,
  ) {
    const conflict = await this.findActiveSiblingByName(
      ownerUserId,
      name,
      parentFolderId,
      projectId,
      excludeId,
    );
    if (conflict) {
      this.throwDuplicateNameConflict(conflict);
    }
  }

  async findProjectRootFolder(projectId: string) {
    const rootFolder = await this.prisma.documentItem.findFirst({
      where: {
        projectId,
        parentFolderId: null,
        type: ItemType.FOLDER,
        isArchived: false,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!rootFolder) {
      throw new NotFoundException('Project documents folder not found');
    }

    return rootFolder;
  }

  async resolveWritableParentFolder(
    userId: string,
    userEmail: string,
    parentFolderId?: string | null,
    projectId?: string | null,
    archivedMessage = 'Cannot modify an archived or trashed folder',
  ): Promise<(DocumentItem & { shares: DocumentShare[] }) | null> {
    let parentFolder: (DocumentItem & { shares: DocumentShare[] }) | null =
      null;

    if (parentFolderId) {
      parentFolder = await this.access.checkPermission(
        parentFolderId,
        userId,
        userEmail,
        DocumentRole.EDITOR,
      );
    } else if (projectId) {
      const rootFolder = await this.findProjectRootFolder(projectId);
      parentFolder = await this.access.checkPermission(
        rootFolder.id,
        userId,
        userEmail,
        DocumentRole.EDITOR,
      );
    }

    if (!parentFolder) return null;
    if (parentFolder.type !== ItemType.FOLDER) {
      throw new BadRequestException('Parent item must be a folder');
    }
    if (parentFolder.isArchived) {
      throw new BadRequestException(archivedMessage);
    }

    return parentFolder;
  }

  async validateUploadNameConflict(
    userId: string,
    userEmail: string,
    options: {
      name: string;
      parentFolderId?: string | null;
      projectId?: string | null;
      overwriteItemId?: string;
    },
  ) {
    const conflict = await this.findActiveSiblingByName(
      userId,
      options.name,
      options.parentFolderId,
      options.projectId,
    );

    if (!conflict) {
      if (options.overwriteItemId) {
        throw new ConflictException(
          'The file selected for overwrite no longer matches this upload',
        );
      }
      return null;
    }

    if (conflict.type === ItemType.FOLDER) {
      this.throwDuplicateNameConflict(conflict);
    }

    if (!options.overwriteItemId) {
      this.throwDuplicateNameConflict(conflict);
    }

    if (conflict.id !== options.overwriteItemId) {
      throw new ConflictException(
        'The file selected for overwrite no longer matches this upload',
      );
    }

    await this.access.checkPermission(
      conflict.id,
      userId,
      userEmail,
      DocumentRole.EDITOR,
    );
    return conflict;
  }

  splitFileName(name: string) {
    const dotIndex = name.lastIndexOf('.');
    if (dotIndex <= 0 || dotIndex === name.length - 1) {
      return { base: name, ext: '' };
    }
    return { base: name.slice(0, dotIndex), ext: name.slice(dotIndex) };
  }

  async getAvailableImportName(
    ownerUserId: string,
    originalName: string,
    parentFolderId: string | null,
    projectId: string,
  ) {
    const normalizedName = this.normalizeItemName(originalName);
    const { base, ext } = this.splitFileName(normalizedName);
    let candidate = normalizedName;
    let suffix = 1;
    while (
      await this.findActiveSiblingByName(
        ownerUserId,
        candidate,
        parentFolderId,
        projectId,
      )
    ) {
      candidate = `${base} (${suffix})${ext}`;
      suffix += 1;
    }
    return candidate;
  }

  async getNameConflict(
    userId: string,
    userEmail: string,
    options: {
      name: string;
      parentFolderId?: string;
      projectId?: string;
    },
  ) {
    const parentFolder = await this.resolveWritableParentFolder(
      userId,
      userEmail,
      options.parentFolderId,
      options.projectId,
      'Cannot upload files into an archived or trashed folder',
    );

    const projectId = parentFolder?.projectId || options.projectId || null;
    const conflict = await this.findActiveSiblingByName(
      userId,
      options.name,
      parentFolder?.id ?? null,
      projectId,
    );

    return {
      exists: Boolean(conflict),
      item: conflict
        ? {
            id: conflict.id,
            name: conflict.name,
            type: conflict.type,
          }
        : null,
    };
  }
}
