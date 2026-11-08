"use client";

import { useDndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { documentsApi } from "../api/documents.api";
import type { DocumentItem } from "../types/documents.types";
import { DocumentItemType } from "../types/documents.enums";
import {
  DocumentBulkAction as Action,
  DOCUMENT_BULK_MESSAGES as M,
  type DocumentDragData,
  type DocumentMultiSelection,
  type DocumentDropData,
} from "../types/document-bulk.types";
import {
  getBulkItemBlockReason,
  getDocumentDropBlockReason,
  getMoveDestinationBlockReason,
  buildDocumentDropPath,
} from "../utils/document-bulk";

export function useDocumentItemDragAndDrop(
  item: DocumentItem,
  selection?: DocumentMultiSelection,
) {
  const userId = useAppSelector((state) => state.auth.userId);
  const { active } = useDndContext();
  const dragging = active?.data.current as DocumentDragData | undefined;
  const sources = selection?.items?.length ? [...selection.items] : [item];
  const moveBlocked = getBulkItemBlockReason(item, Action.MOVE);
  const selectionAllowsDrag =
    !selection ||
    (selection.action === Action.MOVE &&
      selection.selectedIds.has(item.id) &&
      !selection.disabled);
  const draggable = useDraggable({
    id: item.id,
    data: { document: item, items: sources } satisfies DocumentDragData,
    disabled: !selectionAllowsDrag,
  });
  const isFolder = item.type === DocumentItemType.FOLDER;
  const basicReason = dragging
    ? getDocumentDropBlockReason(dragging.items, item)
    : getMoveDestinationBlockReason(item, item.projectId ?? undefined);
  const checkPath = !!dragging && isFolder && !basicReason;
  const path = useQuery({
    queryKey: ["documents", "drop-path", userId, item.id],
    queryFn: async () => {
      const [ancestors, access] = await Promise.all([
        documentsApi.getBreadcrumbs(item.id),
        documentsApi.getAccessibleItem(item.id),
      ]);

      return { ancestors, access };
    },
    enabled: !!userId && checkPath,
    staleTime: 0,
    retry: false,
  });
  const ancestorIds = path.data?.ancestors.map((folder) => folder.id) ?? [];
  const verifiedFolder = path.data
    ? {
        ...item,
        userRole: path.data.access.userRole,
        projectId: path.data.access.projectId,
        name: path.data.access.name,
      }
    : item;
  const dropBlocked =
    basicReason ??
    (checkPath
      ? path.isError
        ? M.DROP_UNAVAILABLE
        : path.isFetching || !path.data
          ? M.DROP_CHECKING
          : getDocumentDropBlockReason(
              dragging!.items,
              verifiedFolder,
              ancestorIds,
            )
      : undefined);
  const modeAllowsDrop =
    !selection || (selection.action === Action.MOVE && !selection.disabled);
  const canDrop = !!dragging && modeAllowsDrop && isFolder && !dropBlocked;
  const droppable = useDroppable({
    id: item.id,
    data: {
      document: {
        ...verifiedFolder,
        path: buildDocumentDropPath(verifiedFolder, path.data?.ancestors),
      },
      ancestorIds,
      canDrop,
      blockedReason: dropBlocked,
    } satisfies DocumentDropData,
    disabled:
      !dragging || !modeAllowsDrop || !isFolder || active?.id === item.id,
  });

  return {
    ...draggable,
    setDraggableRef: draggable.setNodeRef,
    setDroppableRef: droppable.setNodeRef,
    isOver: droppable.isOver && canDrop,
    dropBlocked: dragging && isFolder ? dropBlocked : undefined,
    moveBlocked,
    dragCount: sources.length,
  };
}
