import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemType, DocumentItem, Prisma } from '@prisma/client';

@Injectable()
export class DocumentTreeService {
  constructor(private readonly prisma: PrismaService) {}
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

  async getFolderDescendants(
    folderId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<{ files: DocumentItem[]; folderIds: string[] }> {
    const files: DocumentItem[] = [];
    const folderIds: string[] = [folderId];
    const queue: string[] = [folderId];
    const includeArchived = options.includeArchived ?? true;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await this.prisma.documentItem.findMany({
        where: {
          parentFolderId: currentId,
          ...(includeArchived ? {} : { isArchived: false }),
        },
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

  async getFolderContainedSize(
    folderId: string,
    options: { includeArchived?: boolean } = {},
  ): Promise<number> {
    const descendants = await this.getFolderDescendants(folderId, {
      includeArchived: options.includeArchived ?? false,
    });
    return descendants.files.reduce(
      (sum, file) => sum + Number(file.sizeBytes),
      0,
    );
  }

  async lockDocumentTree(
    tx: Prisma.TransactionClient,
    rootId: string,
  ): Promise<string[]> {
    const locked = new Set<string>();
    while (true) {
      const descendants = await tx.$queryRaw<
        Array<{ id: string }>
      >`WITH RECURSIVE tree AS (
        SELECT id FROM document_items WHERE id = ${rootId}::uuid
        UNION SELECT child.id FROM document_items child JOIN tree ON child.parent_folder_id = tree.id
      ) SELECT id FROM tree`;
      const missing = descendants
        .map((row) => row.id)
        .filter((id) => !locked.has(id))
        .sort();
      if (!missing.length) return descendants.map((row) => row.id);
      // FK writers take KEY SHARE on their immediate parent. Locking every node
      // prevents an upload/move from entering the tree after the final snapshot.
      await tx.$queryRaw`SELECT id FROM document_items WHERE id IN (${Prisma.join(missing.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`;
      missing.forEach((id) => locked.add(id));
    }
  }

  async getFolderDescendantsWithPaths(
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
}
