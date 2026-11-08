"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "@/store/store";
import { documentsApi } from "../api/documents.api";
import { DND_ROOT_ID } from "../types/documents.constants";
import { DocumentItemType, DocumentRole } from "../types/documents.enums";
import {
  DOCUMENT_BULK_MESSAGES as M,
  type DocumentDragData,
  type DocumentDropData,
  type DocumentDropDestination,
} from "../types/document-bulk.types";
import {
  getDocumentDropBlockReason,
  buildDocumentDropPath,
} from "../utils/document-bulk";

export function useDocumentBreadcrumbDrop(
  folderId: string | null,
  name: string,
  allowRootDrop: boolean,
) {
  const userId = useAppSelector((state) => state.auth.userId);
  const { active } = useDndContext();
  const dragging = active?.data.current as DocumentDragData | undefined;
  const target = useQuery({
    queryKey: ["documents", "breadcrumb-drop", userId, folderId],
    queryFn: async () => {
      const [access, ancestors] = await Promise.all([
        documentsApi.getAccessibleItem(folderId!),
        documentsApi.getBreadcrumbs(folderId!),
      ]);

      return { access, ancestors };
    },
    enabled: !!userId && !!folderId && !!dragging,
    staleTime: 0,
    retry: false,
  });
  const destination: DocumentDropDestination = {
    id: folderId,
    name: target.data?.access.name ?? name,
    type: DocumentItemType.FOLDER,
    projectId: target.data?.access.projectId ?? null,
    parentFolderId: null,
    userRole: folderId
      ? (target.data?.access.userRole ?? DocumentRole.NONE)
      : DocumentRole.OWNER,
    isArchived: false,
  };
  const ancestorIds = target.data?.ancestors.map((folder) => folder.id) ?? [];
  const blockedReason =
    !folderId && !allowRootDrop
      ? M.DROP_VIEW_NOT_FOLDER
      : folderId && target.isError
        ? M.DROP_UNAVAILABLE
        : folderId && (target.isFetching || !target.data)
          ? M.DROP_CHECKING
          : dragging
            ? getDocumentDropBlockReason(
                dragging.items,
                destination,
                ancestorIds,
              )
            : undefined;
  const canDrop = !!userId && !!dragging && !blockedReason;
  const droppable = useDroppable({
    id: folderId ?? DND_ROOT_ID,
    data: {
      document: {
        ...destination,
        path: buildDocumentDropPath(destination, target.data?.ancestors),
      },
      ancestorIds,
      canDrop,
      blockedReason,
    } satisfies DocumentDropData,
    disabled: !userId || !dragging,
  });

  return {
    ...droppable,
    isOver: droppable.isOver && canDrop,
    blockedReason: dragging ? blockedReason : undefined,
  };
}
