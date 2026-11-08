import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentAccessService } from './document-access.service';
import { DocumentLifecycleService } from './document-lifecycle.service';
import { DocumentLocationService } from './document-location.service';
import { DocumentEventPublisher } from './document-event-publisher.service';
import { DocumentBulkDto } from './dto/document-bulk.dto';
import {
  DocumentBulkAction as Action,
  DOCUMENT_BULK,
} from './types/document-bulk.constants';
import { documentBulkBlockReason } from './document-bulk-policy';

@Injectable()
export class DocumentBulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DocumentAccessService,
    private readonly lifecycle: DocumentLifecycleService,
    private readonly locations: DocumentLocationService,
    private readonly events: DocumentEventPublisher,
  ) {}

  async execute(
    userId: string,
    userEmail: string,
    dto: DocumentBulkDto,
  ): Promise<{ count: number }> {
    const contexts: Awaited<
      ReturnType<DocumentAccessService['getAccessContext']>
    >[] = [];
    for (const id of [...new Set(dto.ids)].sort())
      contexts.push(await this.access.getAccessContext(id, userId, userEmail));
    const blocked = contexts.flatMap(({ item, role }) => {
      const reason = documentBulkBlockReason(item, role, dto.action);

      return reason ? [`${item.name}: ${reason}`] : [];
    });
    if (blocked.length)
      throw new BadRequestException(
        `${DOCUMENT_BULK.INVALID_SELECTION} ${blocked.join(' ')}`,
      );
    const items = contexts.map((context) => context.item);
    if (dto.action === Action.MOVE) {
      const selectedIds = new Set(items.map((item) => item.id));
      const parents = new Map(
        items.map((item) => [item.id, item.parentFolderId]),
      );
      for (const item of items) {
        let parentId = item.parentFolderId;
        const visited = new Set<string>();
        while (parentId && !visited.has(parentId)) {
          if (selectedIds.has(parentId))
            throw new BadRequestException(
              `${item.name}: ${DOCUMENT_BULK.NESTED_MOVE}`,
            );
          visited.add(parentId);
          if (!parents.has(parentId)) {
            const parent = await this.prisma.documentItem.findUnique({
              where: { id: parentId },
              select: { parentFolderId: true },
            });
            parents.set(parentId, parent?.parentFolderId ?? null);
          }
          parentId = parents.get(parentId) ?? null;
        }
      }
    }
    const moves =
      dto.action === Action.MOVE
        ? await Promise.all(
            items.map((item) =>
              this.lifecycle.prepareMove(userId, userEmail, item.id, {
                parentFolderId: dto.parentFolderId ?? null,
                projectId: dto.projectId,
              }),
            ),
          )
        : [];

    await this.prisma.$transaction(
      async (tx) => {
        if (dto.action === Action.DELETE) {
          await this.lifecycle.deleteTreesInTransaction(
            tx,
            items.map((item) => item.id),
          );

          return;
        }
        for (const item of items) {
          if (dto.action === Action.MOVE) {
            const move = moves.find((move) => move.item.id === item.id)!;
            await this.locations.lockAvailableName(
              tx,
              item.ownerUserId,
              item.name,
              move.destParentFolderId,
              move.destProjectId,
              [item.id],
            );
            await tx.documentItem.update({
              where: { id: item.id },
              data: {
                parentFolderId: move.destParentFolderId,
                projectId: move.destProjectId,
              },
            });
          } else if (dto.action === Action.STAR) {
            await tx.userStarredDocument.upsert({
              where: {
                userId_documentItemId: { userId, documentItemId: item.id },
              },
              create: { userId, documentItemId: item.id },
              update: {},
            });
          } else if (dto.action === Action.UNSTAR) {
            await tx.userStarredDocument.deleteMany({
              where: { userId, documentItemId: item.id },
            });
          } else {
            const archive = dto.action === Action.TRASH;
            if (!archive)
              await this.locations.lockAvailableName(
                tx,
                item.ownerUserId,
                item.name,
                item.parentFolderId,
                item.projectId,
                [item.id],
              );
            await tx.documentItem.update({
              where: { id: item.id },
              data: {
                isArchived: archive,
                archivedAt: archive ? new Date() : null,
              },
            });
          }
        }
      },
      { timeout: DOCUMENT_BULK.TRANSACTION_TIMEOUT_MS },
    );
    for (const item of items) {
      const move = moves.find((prepared) => prepared.item.id === item.id);
      await this.events.publishProjectDocumentEvent(
        move
          ? {
              ...item,
              parentFolderId: move.destParentFolderId,
              projectId: move.destProjectId,
            }
          : item,
        userId,
        dto.action === Action.DELETE || dto.action === Action.TRASH
          ? 'DELETED'
          : 'UPDATED',
      );
    }

    return { count: items.length };
  }
}
