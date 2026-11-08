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
    if (
      !source?.items?.length ||
      !destination?.canDrop ||
      active.id === over.id
    )
      return;
    if (
      getDocumentDropBlockReason(
        source.items,
        destination.document,
        destination.ancestorIds,
      )
    )
      return;
    onDropItems(source.items, destination.document);
  };

  return {
    sensors,
    handleDragEnd,
  };
}
