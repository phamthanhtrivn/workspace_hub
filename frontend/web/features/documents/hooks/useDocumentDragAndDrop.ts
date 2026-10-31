"use client";

import { getApiErrorMessage } from "@/lib/api-error";
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DragEndEvent } from "@dnd-kit/core";
import { DND_ROOT_ID } from "../types/documents.constants";
import { toast } from "sonner";

export interface UseDocumentDragAndDropOptions {
  onMoveItem: (itemId: string, targetFolderId: string | null) => Promise<unknown>;
}

export function useDocumentDragAndDrop({ onMoveItem }: UseDocumentDragAndDropOptions) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to move item via drag and drop"));
    }
  };

  return {
    sensors,
    handleDragEnd,
  };
}
