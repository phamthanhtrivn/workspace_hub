"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { DND_ROOT_ID } from "../../types/documents.constants";
import { NavigationLabel } from "../../types/documents.enums";

export interface BreadcrumbLinkProps {
  name: string;
  folderId: string | null;
  isActive: boolean;
  onClick: () => void;
}

export function BreadcrumbLink({ name, folderId, isActive, onClick }: BreadcrumbLinkProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: folderId === null ? DND_ROOT_ID : folderId,
  });
  const navigationLabels: Partial<Record<NavigationLabel | "Folder", string>> = {
    [NavigationLabel.ROOT]: "My files",
    [NavigationLabel.CURRENT_FOLDER]: "Current folder",
    [NavigationLabel.STARRED]: "Starred",
    [NavigationLabel.SHARED]: "Shared",
    [NavigationLabel.TRASH]: "Trash",
    Folder: "Folder",
  };
  const displayName = navigationLabels[name as NavigationLabel | "Folder"] || name;

  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      className={cn(
        "font-semibold text-xs px-2 py-1 rounded-md transition-all cursor-pointer",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-info hover:bg-muted",
        isOver && "bg-info-soft text-info ring-2 ring-dashed ring-ring scale-105"
      )}
    >
      {displayName}
    </button>
  );
}

export default React.memo(BreadcrumbLink);
