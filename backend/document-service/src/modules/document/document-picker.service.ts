import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { authorizeProject } from '../../common/auth/project-authorization';
import { DocumentAccessService } from './document-access.service';
import { DocumentPresentationService } from './document-presentation.service';
import type { DocumentPickerQuery } from './dto/document-picker.dto';

@Injectable()
export class DocumentPickerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly presentation: DocumentPresentationService,
  ) {}
  async list(userId: string, email: string, query: DocumentPickerQuery) {
    const limit = Number(query.limit ?? 12),
      requestedPage = Number(query.page ?? 1);
    const where: Prisma.DocumentItemWhereInput = {
      isArchived: false,
      name: query.search?.trim()
        ? { contains: query.search.trim(), mode: 'insensitive' }
        : undefined,
    };
    if (query.folderId) {
      const folder = await this.access.checkPermission(
        query.folderId,
        userId,
        email,
      );
      if (
        folder.type !== 'FOLDER' ||
        folder.isArchived ||
        (query.scope === 'personal' &&
          (folder.projectId || folder.ownerUserId !== userId)) ||
        (query.scope === 'project' && folder.projectId !== query.projectId)
      )
        throw new BadRequestException('Folder is outside this picker.');
      Object.assign(where, {
        parentFolderId: folder.id,
        projectId: folder.projectId,
      });
      if (query.scope === 'personal') where.ownerUserId = userId;
    } else if (query.scope === 'personal')
      Object.assign(where, {
        ownerUserId: userId,
        projectId: null,
        parentFolderId: null,
      });
    else if (query.scope === 'shared')
      Object.assign(where, {
        ownerUserId: { not: userId },
        shares: {
          some: {
            OR: [
              { shareWithUserId: userId },
              {
                shareWithUserId: null,
                shareWithEmail: { equals: email, mode: 'insensitive' },
              },
            ],
          },
        },
      });
    else {
      if (!query.projectId)
        throw new BadRequestException('Project is required.');
      await authorizeProject(userId, query.projectId);
      Object.assign(where, {
        projectId: query.projectId,
        parentFolderId: null,
      });
    }
    const orderBy: Prisma.DocumentItemOrderByWithRelationInput[] = [
      { type: 'asc' },
      { updatedAt: 'desc' },
      { id: 'asc' },
    ];
    const include = {
      versions: { orderBy: { versionNumber: 'desc' as const }, take: 1 },
    };
    let totalItems: number;
    let page: number;
    let rows: Prisma.DocumentItemGetPayload<{ include: typeof include }>[];
    if (query.scope === 'shared' && !query.folderId) {
      const candidates = await this.prisma.documentItem.findMany({
        where,
        orderBy,
        include,
      });
      // Named personal grants are proven by the query. Project membership is
      // authoritative and checked once per project, not once per shared file.
      const denied = new Set<string>();
      await Promise.all(
        [
          ...new Set(
            candidates.flatMap((file) =>
              file.projectId ? [file.projectId] : [],
            ),
          ),
        ].map(async (projectId) => {
          try {
            await authorizeProject(userId, projectId);
          } catch (error) {
            if (!(error instanceof ForbiddenException)) throw error;
            denied.add(projectId);
          }
        }),
      );
      const readable = candidates.filter(
        (file) => !file.projectId || !denied.has(file.projectId),
      );
      totalItems = readable.length;
      page = Math.min(
        requestedPage,
        Math.max(1, Math.ceil(totalItems / limit)),
      );
      rows = readable.slice((page - 1) * limit, page * limit);
    } else {
      totalItems = await this.prisma.documentItem.count({ where });
      page = Math.min(
        requestedPage,
        Math.max(1, Math.ceil(totalItems / limit)),
      );
      rows = await this.prisma.documentItem.findMany({
        where,
        orderBy,
        include,
        skip: (page - 1) * limit,
        take: limit,
      });
    }
    const enriched = await this.presentation.enrichDocumentItems(rows);

    return {
      message: 'Files retrieved',
      data: enriched.map((file) => ({
        ...file,
        versionId: file.versions[0]?.id,
      })),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
    };
  }
}
