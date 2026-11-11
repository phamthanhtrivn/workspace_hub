import { BadRequestException } from '@nestjs/common';
import type { DocumentItem, Prisma } from '@prisma/client';
import type { DocumentTreeService } from './document-tree.service';
import type { DocumentLocationService } from './document-location.service';
import { DOCUMENT_BULK } from './types/document-bulk.constants';

/** Shared by single and bulk Star/Unstar; the caller owns the transaction. */
export async function setDocumentTreesStarred(
  tx: Prisma.TransactionClient,
  tree: DocumentTreeService,
  locations: DocumentLocationService,
  userId: string,
  selected: DocumentItem[],
  isStarred: boolean,
): Promise<void> {
  const trees = new Map<string, string[]>();
  for (const item of [...selected].sort((a, b) => a.id.localeCompare(b.id))) {
    trees.set(item.id, await tree.lockDocumentTree(tx, item.id));
  }
  const ids = [...new Set([...trees.values()].flat())];
  const records = await tx.documentItem.findMany({
    where: { id: { in: ids } },
  });
  if (records.some((item) => item.ownerUserId !== userId || item.projectId)) {
    throw new BadRequestException(DOCUMENT_BULK.OWNER_REQUIRED);
  }
  const current = new Map(records.map((item) => [item.id, item]));
  for (const item of selected) {
    const record = current.get(item.id);
    if (!record || record.isArchived)
      throw new BadRequestException(DOCUMENT_BULK.ACTIVE_REQUIRED);
    if (!isStarred && !record.isStarred)
      throw new BadRequestException(DOCUMENT_BULK.UNSTAR_REQUIRED);
  }
  const roots = selected.filter(
    (item) =>
      !selected.some(
        (parent) =>
          parent.id !== item.id && trees.get(parent.id)!.includes(item.id),
      ),
  );
  for (const selectedRoot of roots) {
    const root = current.get(selectedRoot.id)!;
    // Repeating Star must not pull an already starred child out of its folder.
    if (root.isStarred === isStarred) continue;
    await locations.lockAvailableName(
      tx,
      userId,
      root.name,
      null,
      null,
      [root.id],
      isStarred,
    );
    await tx.documentItem.update({
      where: { id: root.id },
      data: { parentFolderId: null, isStarred },
    });
  }
  await tx.documentItem.updateMany({
    where: { id: { in: ids } },
    data: { isStarred },
  });
  if (isStarred) {
    await tx.userStarredDocument.createMany({
      data: ids.map((documentItemId) => ({ userId, documentItemId })),
      skipDuplicates: true,
    });
  } else {
    await tx.userStarredDocument.deleteMany({
      where: { userId, documentItemId: { in: ids } },
    });
  }
}
