"use client";

import {
  useSensors,
  useSensor,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
} from "@dnd-kit/core";
import type { DocumentItem } from "../types/documents.types";
import type {
  DocumentDragData,
  DocumentDropData,
  DocumentDropDestination,
} from "../types/document-bulk.types";
import { getDocumentDropBlockReason } from "../utils/document-bulk";
import { toast } from "sonner";
import { DOCUMENT_BULK_MESSAGES as M } from "../types/document-bulk.types";

export interface UseDocumentDragAndDropOptions {
  onDropItems: (
    items: DocumentItem[],
    destination: DocumentDropDestination,
  ) => void;
}

export function useDocumentDragAndDrop({
  onDropItems,
}: UseDocumentDragAndDropOptions) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const source = active.data.current as DocumentDragData | undefined;
    const destination = over.data.current as DocumentDropData | undefined;
    if (!source?.items?.length || !destination?.document) return;
    const reason =
      destination.blockedReason ??
      getDocumentDropBlockReason(
        source.items,
        destination.document,
        destination.ancestorIds,
      );
    if (reason || !destination.canDrop) {
      toast.info(reason ?? M.DROP_UNAVAILABLE);

      return;
    }
    onDropItems(source.items, destination.document);
  };

  return {
    sensors,
    handleDragEnd,
  };
}
