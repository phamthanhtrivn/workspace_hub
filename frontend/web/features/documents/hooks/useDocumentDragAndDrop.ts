"use client";

import { useSensors, useSensor, PointerSensor, DragEndEvent } from "@dnd-kit/core";
import { DND_ROOT_ID } from "../types/documents.constants";
import { toast } from "sonner";

export interface UseDocumentDragAndDropOptions {
  onMoveItem: (itemId: string, targetFolderId: string | null) => Promise<any>;
}

export function useDocumentDragAndDrop({ onMoveItem }: UseDocumentDragAndDropOptions) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    try {
      if (overId === DND_ROOT_ID) {
        await onMoveItem(activeId, null);
      } else {
        await onMoveItem(activeId, overId);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to move item via drag and drop");
    }
  };

  return {
    sensors,
    handleDragEnd,
  };
}
